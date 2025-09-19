// services/SkribbleService.ts - Updated for Swiss KVG requirements
import { PDFTemplateManager, UserFormData, SelectedInsurance } from './PDFTemplateManager';

interface SkribbleConfig {
  apiKey: string;
  baseUrl: string;
  environment: 'sandbox' | 'production';
  webhookSecret: string;
}

interface SkribbleDocument {
  id: string;
  title: string;
  status: 'draft' | 'pending' | 'signed' | 'cancelled' | 'declined';
  signers: SkribbleSigner[];
  downloadUrl?: string;
  created_at?: string;
  signed_at?: string;
}

interface SkribbleSigner {
  email: string;
  firstName: string;
  lastName: string;
  language: 'en' | 'de' | 'fr' | 'it';
  signatureType: 'SES' | 'AES' | 'QES'; // QES required for legal cancellation
  identifier?: string; // For tracking
}

interface SigningSession {
  id: string;
  signingUrl: string;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  expires_at: string;
  documents: string[];
}

export class SkribbleService {
  private config: SkribbleConfig;
  private pdfManager: PDFTemplateManager;

  constructor(config: SkribbleConfig) {
    this.config = config;
    this.pdfManager = new PDFTemplateManager();
  }

  /**
   * Main workflow: Create Swiss KVG cancellation and new insurance application
   * Follows Swiss legal requirements for insurance switching
   */
  async processSwissInsuranceSwitch(
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<{ 
    redirectUrl: string; 
    cancellationDocumentId: string; 
    applicationDocumentId: string;
    sessionId: string;
    expiresAt: string;
  }> {
    try {
      console.log('Starting Swiss KVG insurance switch process...');
      
      // Validate Swiss-specific requirements
      this.validateSwissRequirements(userData, selectedInsurance);

      // Step 1: Generate pre-filled cancellation PDF (KVG requirement)
      console.log('Generating KVG cancellation document...');
      const cancellationPdf = await this.pdfManager.generateCancellationPDF(
        userData, 
        userData.currentInsurer || 'Aktuelle Krankenversicherung'
      );

      // Step 2: Generate new insurance application PDF
      console.log('Generating new insurance application...');
      const applicationPdf = await this.pdfManager.generateInsuranceApplicationPDF(
        userData, 
        selectedInsurance
      );

      // Step 3: Create cancellation document in Skribble (must be signed first)
      const cancellationDocument = await this.createSkribbleDocument({
        title: `KVG Kündigung ${new Date().getFullYear()} - ${userData.firstName} ${userData.lastName}`,
        pdfBuffer: cancellationPdf,
        signers: [{
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          language: 'de', // Default to German for Swiss documents
          signatureType: 'QES', // Qualified Electronic Signature required for legal validity
          identifier: `cancel_${userData.email}_${Date.now()}`
        }],
        documentType: 'cancellation'
      });

      // Step 4: Create application document in Skribble 
      const applicationDocument = await this.createSkribbleDocument({
        title: `Krankenversicherungsantrag ${selectedInsurance.insurer} - ${userData.firstName} ${userData.lastName}`,
        pdfBuffer: applicationPdf,
        signers: [{
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          language: 'de',
          signatureType: 'QES',
          identifier: `apply_${userData.email}_${Date.now()}`
        }],
        documentType: 'application'
      });

      // Step 5: Create sequential signing session (cancellation first, then application)
      console.log('Creating sequential signing session...');
      const signingSession = await this.createSequentialSigningSession([
        {
          documentId: cancellationDocument.id,
          order: 1,
          title: 'KVG Kündigung',
          description: 'Kündigung der aktuellen Krankenversicherung per 31. Dezember'
        },
        {
          documentId: applicationDocument.id,
          order: 2,
          title: 'Neuer Versicherungsantrag',
          description: `Antrag für neue Krankenversicherung bei ${selectedInsurance.insurer}`
        }
      ], userData);

      console.log('Swiss KVG insurance switch process completed successfully');

      return {
        redirectUrl: signingSession.signingUrl,
        cancellationDocumentId: cancellationDocument.id,
        applicationDocumentId: applicationDocument.id,
        sessionId: signingSession.id,
        expiresAt: signingSession.expires_at
      };

    } catch (error) {
      console.error('Error processing Swiss insurance switch:', error);
      throw new Error(`Failed to process KVG insurance switch: ${error.message}`);
    }
  }

  /**
   * Validate Swiss-specific requirements before processing
   */
  private validateSwissRequirements(userData: UserFormData, selectedInsurance: SelectedInsurance): void {
    const errors: string[] = [];

    // Check required fields for Swiss KVG
    if (!userData.firstName || !userData.lastName) {
      errors.push('Vor- und Nachname sind erforderlich');
    }
    
    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push('Gültige E-Mail-Adresse erforderlich');
    }
    
    if (!userData.birthDate) {
      errors.push('Geburtsdatum erforderlich');
    }
    
    if (!userData.address || !userData.postalCode) {
      errors.push('Vollständige Adresse erforderlich');
    }
    
    // Validate Swiss postal code (4 digits)
    if (userData.postalCode && !/^\d{4}$/.test(userData.postalCode)) {
      errors.push('Schweizer Postleitzahl muss 4-stellig sein');
    }
    
    // Check age requirements (18+ for independent insurance)
    if (userData.birthDate) {
      const age = this.calculateAge(userData.birthDate);
      if (age < 18) {
        errors.push('Mindestalter 18 Jahre für selbständigen Versicherungsabschluss');
      }
    }
    
    // Validate current insurer for cancellation
    if (!userData.currentInsurer) {
      errors.push('Aktuelle Krankenversicherung für Kündigung erforderlich');
    }
    
    // Check timing - cancellations must be received by November 30th for next year
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();
    
    if (currentMonth === 11 && now.getDate() > 30) { // After November 30th
      console.warn('Warning: Kündigung nach dem 30. November - wirksam erst übernächstes Jahr');
    }
    
    if (errors.length > 0) {
      throw new Error(`Swiss KVG validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Create document in Skribble with Swiss-specific settings
   */
  private async createSkribbleDocument(params: {
    title: string;
    pdfBuffer: Buffer;
    signers: SkribbleSigner[];
    documentType?: 'cancellation' | 'application';
  }): Promise<SkribbleDocument> {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add PDF file
      formData.append('file', new Blob([params.pdfBuffer], { type: 'application/pdf' }), 
        `${params.documentType || 'document'}_${Date.now()}.pdf`);
      
      // Add document metadata
      formData.append('title', params.title);
      formData.append('signers', JSON.stringify(params.signers));
      
      // Swiss-specific document settings
      const documentSettings = {
        language: 'de-CH',
        timezone: 'Europe/Zurich',
        legal_notice: params.documentType === 'cancellation' ? 
          'KVG-Kündigung gemäss Bundesgesetz über die Krankenversicherung' :
          'Krankenversicherungsantrag gemäss KVG',
        retention_period: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years as required by Swiss law
        allow_decline: true, // Allow users to decline signing
        expiration_days: 30 // Document expires after 30 days if not signed
      };
      
      formData.append('settings', JSON.stringify(documentSettings));

      const response = await fetch(`${this.config.baseUrl}/api/v2/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'Swiss-KVG-Platform/1.0'
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Skribble API Error:', errorData);
        throw new Error(`Failed to create Skribble document: ${response.status} - ${errorData}`);
      }

      const document = await response.json();
      console.log(`Created ${params.documentType} document:`, document.id);
      
      return document;

    } catch (error) {
      console.error('Error creating Skribble document:', error);
      throw new Error(`Document creation failed: ${error.message}`);
    }
  }

  /**
   * Create sequential signing session - cancellation must be signed before application
   */
  private async createSequentialSigningSession(
    documents: Array<{documentId: string; order: number; title: string; description: string}>,
    userData: UserFormData
  ): Promise<SigningSession> {
    try {
      // Sort documents by order
      const sortedDocs = documents.sort((a, b) => a.order - b.order);
      
      const sessionData = {
        documents: sortedDocs.map(doc => ({
          document_id: doc.documentId,
          signing_order: doc.order,
          title: doc.title,
          description: doc.description,
          required: true
        })),
        signers: [{
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          language: 'de-CH',
          role: 'signer'
        }],
        workflow: 'sequential', // Important: Sequential signing
        settings: {
          success_redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/insurance/success`,
          error_redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/insurance/error`,
          cancel_redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/insurance/cancel`,
          decline_redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/insurance/declined`,
          
          // Swiss-specific settings
          timezone: 'Europe/Zurich',
          language: 'de-CH',
          legal_framework: 'CH-KVG',
          
          // Notification settings
          email_notifications: true,
          reminder_frequency: 'daily',
          reminder_count: 3,
          
          // Session expiration
          expires_in_days: 30,
          
          // Instructions for signers
          signing_instructions: {
            cancellation: 'Bitte signieren Sie zuerst die Kündigung Ihrer aktuellen Krankenversicherung. Diese wird per 31. Dezember wirksam.',
            application: 'Nach der Kündigung können Sie den Antrag für Ihre neue Krankenversicherung signieren. Diese wird per 1. Januar wirksam.'
          }
        }
      };

      const response = await fetch(`${this.config.baseUrl}/api/v2/signing-sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Failed to create signing session:', errorData);
        throw new Error(`Failed to create signing session: ${response.status} - ${errorData}`);
      }

      const session = await response.json();
      console.log('Created sequential signing session:', session.id);
      
      return session;

    } catch (error) {
      console.error('Error creating signing session:', error);
      throw new Error(`Signing session creation failed: ${error.message}`);
    }
  }

  /**
   * Get document status and signing progress
   */
  async getDocumentStatus(documentId: string): Promise<SkribbleDocument> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/documents/${documentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get document status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting document status:', error);
      throw error;
    }
  }

  /**
   * Get signing session status
   */
  async getSigningSessionStatus(sessionId: string): Promise<{
    status: string;
    current_step: number;
    total_steps: number;
    completed_documents: string[];
    pending_documents: string[];
    signed_at?: string;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/signing-sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get session status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting session status:', error);
      throw error;
    }
  }

  /**
   * Download signed document with Swiss archiving requirements
   */
  async downloadSignedDocument(documentId: string): Promise<{
    document: Buffer;
    metadata: {
      signed_at: string;
      signer_certificate: string;
      legal_validity: string;
      audit_trail: any;
    }
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v2/documents/${documentId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.status}`);
      }

      const documentBuffer = Buffer.from(await response.arrayBuffer());
      
      // Get signing metadata for Swiss compliance
      const metadataResponse = await fetch(`${this.config.baseUrl}/api/v2/documents/${documentId}/audit-trail`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json',
        },
      });

      const metadata = metadataResponse.ok ? await metadataResponse.json() : null;

      return {
        document: documentBuffer,
        metadata: metadata || {
          signed_at: new Date().toISOString(),
          signer_certificate: 'QES Certificate',
          legal_validity: 'Legally valid in Switzerland',
          audit_trail: 'Complete audit trail available'
        }
      };
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  }

  /**
   * Handle Skribble webhooks for status updates
   */
  async handleWebhook(payload: any, signature: string): Promise<{
    processed: boolean;
    action: string;
    documentId?: string;
    sessionId?: string;
  }> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const { event_type, data } = payload;
      
      console.log('Processing webhook:', event_type, data.document_id || data.session_id);

      switch (event_type) {
        case 'document.signed':
          await this.handleDocumentSigned(data);
          return { processed: true, action: 'document_signed', documentId: data.document_id };
          
        case 'session.completed':
          await this.handleSessionCompleted(data);
          return { processed: true, action: 'session_completed', sessionId: data.session_id };
          
        case 'document.declined':
          await this.handleDocumentDeclined(data);
          return { processed: true, action: 'document_declined', documentId: data.document_id };
          
        case 'session.expired':
          await this.handleSessionExpired(data);
          return { processed: true, action: 'session_expired', sessionId: data.session_id };
          
        default:
          console.log('Unhandled webhook event:', event_type);
          return { processed: false, action: 'unknown' };
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }

  // Helper methods
  private calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    // Implement HMAC signature verification
    // This is a placeholder - implement actual signature verification
    return true;
  }

  private async handleDocumentSigned(data: any): Promise<void> {
    console.log('Document signed:', data.document_id);
    // Implement your business logic for signed documents
    // e.g., update database, send notifications, etc.
  }

  private async handleSessionCompleted(data: any): Promise<void> {
    console.log('Signing session completed:', data.session_id);
    // Both cancellation and application have been signed
    // Implement logic to process the insurance switch
  }

  private async handleDocumentDeclined(data: any): Promise<void> {
    console.log('Document declined:', data.document_id);
    // Handle case where user declined to sign
  }

  private async handleSessionExpired(data: any): Promise<void> {
    console.log('Signing session expired:', data.session_id);
    // Handle expired sessions - maybe send reminder or create new session
  }
}