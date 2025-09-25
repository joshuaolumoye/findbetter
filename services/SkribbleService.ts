// services/SkribbleService.ts - FIXED to actually create signature requests
import { PDFTemplateManager } from './PDFTemplateManager';

interface SkribbleConfig {
  apiKey: string;
  baseUrl: string;
  environment: 'sandbox' | 'production';
  webhookSecret: string;
  username?: string;
}

export class SkribbleService {
  private config: SkribbleConfig;
  private pdfManager: PDFTemplateManager;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: SkribbleConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.skribble.de'
    };
    this.pdfManager = new PDFTemplateManager();
    
    console.log('Initializing Skribble service for signature requests:', {
      environment: this.config.environment,
      baseUrl: this.config.baseUrl,
      hasApiKey: !!this.config.apiKey,
      username: this.config.username
    });
  }

  /**
   * Username + API Key authentication
   */
  private async login(): Promise<string> {
    console.log('Authenticating with Skribble...');
    
    try {
      const authUrl = `${this.config.baseUrl}/v2/access/login`;

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'CompanioxApp/1.0'
        },
        body: JSON.stringify({
          username: this.config.username,
          "api-key": this.config.apiKey
        }),
      });

      if (response.ok) {
        const token = await response.text();

        if (token && token.startsWith('ey')) {
          this.accessToken = token.trim();
          this.tokenExpiry = Date.now() + (18 * 60 * 1000);
          console.log('✅ Skribble authentication successful');
          return this.accessToken;
        }
      }

      const errorText = await response.text();
      throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
      
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error(`Failed to authenticate with Skribble: ${error.message}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    return await this.login();
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Skribble authentication...');
      const accessToken = await this.getAccessToken();
      console.log('✅ Skribble authentication successful');
      return true;
    } catch (error) {
      console.error('Skribble authentication test failed:', error);
      return false;
    }
  }

  /**
   * FIXED: Process Swiss insurance switch WITH Skribble signature requests
   */
  async processSwissInsuranceSwitch(userData: any, selectedInsurance: any): Promise<any> {
    try {
      console.log('Starting Swiss KVG insurance process with Skribble signature requests...');
      
      // Validate Swiss requirements
      this.validateSwissRequirements(userData, selectedInsurance);

      // Get access token
      const accessToken = await this.getAccessToken();

      // Generate PDFs
      console.log('Generating KVG documents...');
      const [cancellationPdf, applicationPdf] = await Promise.all([
        this.pdfManager.generateCancellationPDF(userData, userData.currentInsurer),
        this.pdfManager.generateInsuranceApplicationPDF(userData, selectedInsurance)
      ]);

      console.log('PDFs generated successfully, creating Skribble signature requests...');

      // Create signature requests in Skribble
      const [cancellationRequest, applicationRequest] = await Promise.all([
        this.createSignatureRequest({
          title: `KVG Kündigung ${new Date().getFullYear()} - ${userData.firstName} ${userData.lastName}`,
          documentBuffer: cancellationPdf,
          signer: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName
          },
          accessToken
        }),
        this.createSignatureRequest({
          title: `Krankenversicherungsantrag ${selectedInsurance.insurer} - ${userData.firstName} ${userData.lastName}`,
          documentBuffer: applicationPdf,
          signer: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName
          },
          accessToken
        })
      ]);

      console.log('Skribble signature requests created successfully');

      // Generate session ID
      const sessionId = `session_${Date.now()}`;

      // Return the ACTUAL Skribble signing URL
      return {
        redirectUrl: cancellationRequest.signingUrl, // ← REAL Skribble signing URL
        cancellationDocumentId: cancellationRequest.documentId,
        applicationDocumentId: applicationRequest.documentId,
        sessionId: sessionId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        mode: 'skribble_signing', // ← Indicates real Skribble mode
        signingUrls: {
          cancellation: cancellationRequest.signingUrl,
          application: applicationRequest.signingUrl
        }
      };

    } catch (error) {
      console.error('Error processing Swiss insurance switch with Skribble:', error);
      throw new Error(`Failed to process KVG insurance switch: ${error.message}`);
    }
  }

  /**
   * Create signature request in Skribble - FIXED for server-side Node.js
   */
  private async createSignatureRequest(params: {
    title: string;
    documentBuffer: Buffer;
    signer: {
      email: string;
      firstName: string;
      lastName: string;
    };
    accessToken: string;
  }): Promise<{ documentId: string; signingUrl: string }> {
    
    console.log(`Creating Skribble signature request: ${params.title}`);
    console.log('PDF Buffer size:', params.documentBuffer.length, 'bytes');

    try {
      // Step 1: Upload document using proper Node.js FormData
      const uploadUrl = `${this.config.baseUrl}/v2/document`;
      
      // Import FormData for Node.js environment
      const FormData = require('form-data');
      const formData = new FormData();
      
      // Create a safe filename (remove special characters)
      const safeTitle = params.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
      const filename = `${safeTitle}.pdf`;
      
      // Validate PDF buffer
      if (!params.documentBuffer || params.documentBuffer.length < 100) {
        throw new Error('Invalid or empty PDF buffer');
      }
      
      // Check if it's actually a PDF
      const pdfHeader = params.documentBuffer.slice(0, 4).toString();
      if (!pdfHeader.startsWith('%PDF')) {
        throw new Error('Buffer does not contain a valid PDF document');
      }

      formData.append('file', params.documentBuffer, {
        filename: filename,
        contentType: 'application/pdf'
      });
      formData.append('title', params.title);

      console.log('Uploading to Skribble:', { 
        url: uploadUrl, 
        filename,
        bufferSize: params.documentBuffer.length,
        title: params.title 
      });

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'User-Agent': 'CompanioxApp/1.0',
          ...formData.getHeaders() // This adds proper Content-Type for multipart/form-data
        },
        body: formData
      });

      console.log('Upload response status:', uploadResponse.status);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload error response:', errorText);
        
        // Handle specific Skribble errors
        if (uploadResponse.status === 401) {
          throw new Error('Skribble authentication failed - check API credentials');
        } else if (uploadResponse.status === 413) {
          throw new Error('PDF file too large for Skribble (max 25MB)');
        } else if (uploadResponse.status === 422) {
          throw new Error('Invalid PDF format or corrupted file');
        } else if (uploadResponse.status === 500) {
          throw new Error('Skribble server error - please try again in a few minutes');
        }
        
        throw new Error(`Document upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      const documentId = uploadResult.id;

      if (!documentId) {
        throw new Error('No document ID returned from Skribble upload');
      }

      console.log(`✅ Document uploaded to Skribble: ${documentId}`);

      // Step 2: Create signature request
      const signatureUrl = `${this.config.baseUrl}/v2/signature-request`;

      const signatureRequestData = {
        document_id: documentId,
        title: params.title,
        message: 'Bitte unterschreiben Sie dieses wichtige KVG-Dokument.',
        signature_type: 'qes', // Qualified Electronic Signature for Swiss legal compliance
        signers: [
          {
            email: params.signer.email,
            first_name: params.signer.firstName,
            last_name: params.signer.lastName,
            language: 'de'
          }
        ],
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/skribble/webhook`,
        expire_days: 30
      };

      console.log('Creating signature request:', { 
        documentId, 
        signerEmail: params.signer.email,
        title: params.title 
      });

      const signatureResponse = await fetch(signatureUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CompanioxApp/1.0'
        },
        body: JSON.stringify(signatureRequestData)
      });

      console.log('Signature request response status:', signatureResponse.status);

      if (!signatureResponse.ok) {
        const errorText = await signatureResponse.text();
        console.error('Signature request error:', errorText);
        throw new Error(`Signature request failed: ${signatureResponse.status} - ${errorText}`);
      }

      const signatureResult = await signatureResponse.json();

      if (!signatureResult.signing_url) {
        console.error('No signing URL in response:', signatureResult);
        throw new Error('No signing URL returned from Skribble');
      }

      console.log(`✅ Signature request created: ${signatureResult.id}`);
      console.log(`✅ Signing URL generated: ${signatureResult.signing_url}`);

      return {
        documentId: documentId,
        signingUrl: signatureResult.signing_url
      };

    } catch (error) {
      console.error('Error creating signature request:', error);
      throw new Error(`Failed to create signature request: ${error.message}`);
    }
  }

  /**
   * Validate Swiss requirements
   */
  private validateSwissRequirements(userData: any, selectedInsurance: any): void {
    const errors: string[] = [];

    if (!userData.firstName || !userData.lastName) {
      errors.push('Vor- und Nachname sind erforderlich');
    }
    
    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push('Gültige E-Mail-Adresse erforderlich');
    }
    
    if (!userData.currentInsurer) {
      errors.push('Aktuelle Krankenversicherung erforderlich');
    }
    
    if (!selectedInsurance.insurer) {
      errors.push('Neue Versicherungsauswahl erforderlich');
    }
    
    if (errors.length > 0) {
      throw new Error(`Swiss KVG validation failed: ${errors.join(', ')}`);
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Get document status from Skribble
   */
  async getDocumentStatus(documentId: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    
    const response = await fetch(`${this.config.baseUrl}/v2/signature-request/${documentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'CompanioxApp/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get document status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Handle Skribble webhook
   */
  async handleWebhook(payload: any, signature: string): Promise<any> {
    console.log('Processing Skribble webhook:', payload);
    
    // Verify webhook signature if needed
    // const isValid = this.verifyWebhookSignature(payload, signature);
    
    return { 
      processed: true, 
      action: payload.event_type || 'unknown',
      documentId: payload.signature_request?.id
    };
  }
}

/**
 * Get Skribble configuration with validation
 */
export const getSkribbleConfig = () => {
  const config = {
    apiKey: process.env.SKRIBBLE_API_KEY || '',
    baseUrl: process.env.SKRIBBLE_BASE_URL || 'https://api.skribble.de',
    environment: (process.env.SKRIBBLE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
    webhookSecret: process.env.SKRIBBLE_WEBHOOK_SECRET || '',
    username: process.env.SKRIBBLE_USERNAME || ''
  };

  if (!config.apiKey) {
    throw new Error('SKRIBBLE_API_KEY environment variable is required');
  }

  if (!config.username) {
    throw new Error('SKRIBBLE_USERNAME environment variable is required');
  }

  console.log('Skribble configuration for signature requests:', {
    environment: config.environment,
    baseUrl: config.baseUrl,
    hasApiKey: !!config.apiKey,
    hasUsername: !!config.username
  });

  return config;
};