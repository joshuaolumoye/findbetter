// services/SkribbleService.ts - UPDATED with No-Account Signer (NAS) support
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
      baseUrl: config.baseUrl || 'https://api.skribble.com'
    };
    this.pdfManager = new PDFTemplateManager();
    
    console.log('Initializing Skribble service with NAS support:', {
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
   * Process Swiss insurance switch using No-Account Signer (NAS)
   */
  async processSwissInsuranceSwitch(userData: any, selectedInsurance: any): Promise<any> {
    try {
      console.log('Starting Swiss KVG insurance process with NAS support...');
      
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

      console.log('PDFs generated successfully, creating Skribble signature requests with NAS...');

      // Create BOTH signature requests with No-Account Signer support
      const signatureRequests = await this.createBothSignatureRequests({
        cancellationPdf,
        applicationPdf,
        userData,
        selectedInsurance,
        accessToken
      });

      console.log('Both Skribble NAS signature requests created successfully');

      // Generate session ID
      const sessionId = `session_${Date.now()}`;

      // Return the signing URLs for both documents
      return {
        success: true,
        sessionId: sessionId,
        cancellationDocumentId: signatureRequests.cancellation.requestId,
        cancellationSigningUrl: signatureRequests.cancellation.signingUrl,
        applicationDocumentId: signatureRequests.application.requestId,
        applicationSigningUrl: signatureRequests.application.signingUrl,
        currentInsurer: userData.currentInsurer,
        selectedInsurer: selectedInsurance.insurer,
        userEmail: userData.email,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

    } catch (error) {
      console.error('Error processing Swiss insurance switch with Skribble NAS:', error);
      throw new Error(`Failed to process KVG insurance switch: ${error.message}`);
    }
  }

  /**
   * Create both signature requests with No-Account Signer (NAS) support
   */
  private async createBothSignatureRequests(params: {
    cancellationPdf: Buffer;
    applicationPdf: Buffer;
    userData: any;
    selectedInsurance: any;
    accessToken: string;
  }): Promise<{
    cancellation: { requestId: string; signingUrl: string };
    application: { requestId: string; signingUrl: string };
  }> {
    
    console.log('Creating both signature requests with NAS enabled...');

    try {
      // Convert PDFs to base64
      const cancellationBase64 = params.cancellationPdf.toString('base64');
      const applicationBase64 = params.applicationPdf.toString('base64');

      // Create cancellation signature request with NAS
      const cancellationRequest = await this.createSignatureRequestV2WithNAS({
        title: `KVG Kündigung ${new Date().getFullYear()} - ${params.userData.firstName} ${params.userData.lastName}`,
        message: 'Bitte unterschreiben Sie diese wichtige KVG-Kündigung.',
        content: cancellationBase64,
        signer: {
          email: params.userData.email,
          firstName: params.userData.firstName,
          lastName: params.userData.lastName
        },
        accessToken: params.accessToken
      });

      // Create application signature request with NAS
      const applicationRequest = await this.createSignatureRequestV2WithNAS({
        title: `Krankenversicherungsantrag ${params.selectedInsurance.insurer} - ${params.userData.firstName} ${params.userData.lastName}`,
        message: 'Bitte unterschreiben Sie diesen Krankenversicherungsantrag.',
        content: applicationBase64,
        signer: {
          email: params.userData.email,
          firstName: params.userData.firstName,
          lastName: params.userData.lastName
        },
        accessToken: params.accessToken
      });

      return {
        cancellation: cancellationRequest,
        application: applicationRequest
      };

    } catch (error) {
      console.error('Error creating NAS signature requests:', error);
      throw new Error(`Failed to create signature requests: ${error.message}`);
    }
  }

  /**
   * NEW: Create signature request with No-Account Signer (NAS) support
   * This allows users to sign without creating a Skribble account
   * 
   * Implementation follows official Skribble documentation:
   * - Combines account_email + signer_identity_data (recommended approach)
   * - Checks for existing Skribble accounts first
   * - Falls back to NAS if no account exists
   * - Returns signature-specific signing_url for NAS users
   */
  private async createSignatureRequestV2WithNAS(params: {
    title: string;
    message: string;
    content: string; // base64 PDF content
    signer: {
      email: string;
      firstName: string;
      lastName: string;
    };
    accessToken: string;
  }): Promise<{ requestId: string; signingUrl: string }> {
    
    console.log(`Creating Skribble NAS signature request: ${params.title}`);

    try {
      const signatureUrl = `${this.config.baseUrl}/v2/signature-requests`;

      // RECOMMENDED APPROACH: Combine account_email + signer_identity_data
      // Benefits:
      // - If account exists: Document appears in user's Skribble account
      // - If no account: User can sign without creating one
      // - Best of both worlds!
      const requestPayload = {
        title: params.title,
        message: params.message,
        content: params.content, // base64 PDF content
        signatures: [
          {
            // Check for existing Skribble account first
            account_email: params.signer.email,
            
            // Enable No-Account Signer functionality
            signer_identity_data: {
              email_address: params.signer.email,
              first_name: params.signer.firstName,
              last_name: params.signer.lastName,
              language: 'de' // German for Swiss users (en, de, fr supported)
              // Optional fields:
              // mobile_number: params.signer.phone,
              // provider: 'identity_provider_name'
            }
          }
        ]
      };

      console.log('Sending NAS signature request to Skribble:', { 
        url: signatureUrl, 
        title: params.title,
        signerEmail: params.signer.email,
        nasEnabled: true,
        language: 'de',
        contentSize: params.content.length
      });

      const response = await fetch(signatureUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'CompanioxApp/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('NAS signature request response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('NAS signature request error response:', errorText);
        
        if (response.status === 401) {
          throw new Error('Skribble authentication failed - check API credentials');
        } else if (response.status === 413) {
          throw new Error('PDF file too large for Skribble (max 25MB)');
        } else if (response.status === 422) {
          throw new Error('Invalid PDF format, corrupted file, or missing signer_identity_data');
        } else if (response.status === 500) {
          throw new Error('Skribble server error - please try again in a few minutes');
        }
        
        throw new Error(`Signature request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.id) {
        console.error('No request ID in response:', result);
        throw new Error('No request ID returned from Skribble');
      }

      // CRITICAL: Extract the correct signing URL for NAS users
      // Use signing_url from signatures[0], NOT the top-level signing_url
      // Top-level signing_url is for regular Skribble accounts only
      // Signature-specific URL works for users without accounts
      const nasSigningUrl = result.signatures?.[0]?.signing_url || '';

      console.log(`✅ NAS signature request created: ${result.id}`);
      console.log(`   Signer can sign without creating a Skribble account`);
      console.log(`   NAS signing URL: ${nasSigningUrl}`);
      console.log(`   Language: German (de)`);

      // Optional: Add language parameter to URL if needed
      // const signingUrlWithLang = `${nasSigningUrl}?lang=de`;

      return {
        requestId: result.id,
        signingUrl: nasSigningUrl // Use the signature-specific URL for NAS users
      };

    } catch (error) {
      console.error('Error creating NAS signature request:', error);
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
    
    const response = await fetch(`${this.config.baseUrl}/v2/signature-requests/${documentId}`, {
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

  console.log('Skribble configuration with NAS support:', {
    environment: config.environment,
    baseUrl: config.baseUrl,
    hasApiKey: !!config.apiKey,
    hasUsername: !!config.username,
    nasEnabled: true,
    language: 'de'
  });

  return config;
};