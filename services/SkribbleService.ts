// services/SkribbleService.ts - UPDATED to use working v2/signature-requests endpoint
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
   * UPDATED: Process Swiss insurance switch using the working v2/signature-requests endpoint
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

      // Create BOTH signature requests using the working endpoint
      const signatureRequests = await this.createBothSignatureRequests({
        cancellationPdf,
        applicationPdf,
        userData,
        selectedInsurance,
        accessToken
      });

      console.log('Both Skribble signature requests created successfully');

      // Generate session ID
      const sessionId = `session_${Date.now()}`;

      // Return the signing URLs for both documents
      return {
        success: true,
        sessionId: sessionId,
        cancellationDocumentId: signatureRequests.cancellation.requestId,
        applicationDocumentId: signatureRequests.application.requestId,
        currentInsurer: userData.currentInsurer,
        selectedInsurer: selectedInsurance.insurer,
        userEmail: userData.email,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

    } catch (error) {
      console.error('Error processing Swiss insurance switch with Skribble:', error);
      throw new Error(`Failed to process KVG insurance switch: ${error.message}`);
    }
  }

  /**
   * NEW: Create both signature requests using the working v2/signature-requests endpoint
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
    
    console.log('Creating both signature requests using v2/signature-requests endpoint...');

    try {
      // Convert PDFs to base64
      const cancellationBase64 = params.cancellationPdf.toString('base64');
      const applicationBase64 = params.applicationPdf.toString('base64');

      // Create cancellation signature request
      const cancellationRequest = await this.createSignatureRequestV2({
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

      // Create application signature request
      const applicationRequest = await this.createSignatureRequestV2({
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
      console.error('Error creating signature requests:', error);
      throw new Error(`Failed to create signature requests: ${error.message}`);
    }
  }

  /**
   * NEW: Create signature request using the working v2/signature-requests endpoint
   */
  private async createSignatureRequestV2(params: {
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
    
    console.log(`Creating Skribble signature request: ${params.title}`);

    try {
      const signatureUrl = `${this.config.baseUrl}/v2/signature-requests`;

      const requestPayload = {
        title: params.title,
        message: params.message,
        content: params.content, // base64 PDF content
        signatures: [
          {
            account_email: params.signer.email
          }
        ]
      };

      console.log('Sending signature request to Skribble:', { 
        url: signatureUrl, 
        title: params.title,
        signerEmail: params.signer.email,
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

      console.log('Signature request response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Signature request error response:', errorText);
        
        if (response.status === 401) {
          throw new Error('Skribble authentication failed - check API credentials');
        } else if (response.status === 413) {
          throw new Error('PDF file too large for Skribble (max 25MB)');
        } else if (response.status === 422) {
          throw new Error('Invalid PDF format or corrupted file');
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

      // ✅ Instead of redirecting to Skribble signing URL, go to success page
      console.log(`✅ Signature request created: ${result.id}`);

      return {
        requestId: result.id,
        signingUrl: '' // empty since we're redirecting to success page instead
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