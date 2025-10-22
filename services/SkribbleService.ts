// services/SkribbleService.ts - UPDATED with SES + Enhanced Debugging
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
    
    console.log('Initializing Skribble service with SES support:', {
      environment: this.config.environment,
      baseUrl: this.config.baseUrl,
      hasApiKey: !!this.config.apiKey,
      username: this.config.username,
      signatureStandard: 'SES'
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
   * Process Swiss insurance switch using SES (Simple Electronic Signature)
   */
  async processSwissInsuranceSwitch(userData: any, selectedInsurance: any): Promise<any> {
    try {
      console.log('Starting Swiss KVG insurance process with SES (Simple Electronic Signature)...');
      
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

      console.log('PDFs generated successfully, creating Skribble SES signature requests...');

      // Create BOTH signature requests with SES
      const signatureRequests = await this.createBothSESSignatureRequests({
        cancellationPdf,
        applicationPdf,
        userData,
        selectedInsurance,
        accessToken
      });

      console.log('Both Skribble SES signature requests created successfully');

      // Generate session ID
      const sessionId = `session_${Date.now()}`;

      // Return the signing URLs for both documents
      return {
        success: true,
        sessionId: sessionId,
        signatureStandard: 'SES',
        cancellationDocumentId: signatureRequests.cancellation.requestId,
        cancellationSigningUrl: signatureRequests.cancellation.signingUrl,
        applicationDocumentId: signatureRequests.application.requestId,
        applicationSigningUrl: signatureRequests.application.signingUrl,
        currentInsurer: userData.currentInsurer,
        selectedInsurer: selectedInsurance.insurer,
        userEmail: userData.email,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        instructions: 'User will receive email invitations to sign both documents. No Skribble account required.',
        mode: 'ses' // Add mode field
      };

    } catch (error) {
      console.error('Error processing Swiss insurance switch with Skribble SES:', error);
      throw new Error(`Failed to process KVG insurance switch: ${error.message}`);
    }
  }

  /**
   * Create both signature requests with SES
   */
  private async createBothSESSignatureRequests(params: {
    cancellationPdf: Buffer;
    applicationPdf: Buffer;
    userData: any;
    selectedInsurance: any;
    accessToken: string;
  }): Promise<{
    cancellation: { requestId: string; signingUrl: string };
    application: { requestId: string; signingUrl: string };
  }> {
    
    console.log('Creating both SES signature requests...');

    try {
      // Convert PDFs to base64
      const cancellationBase64 = params.cancellationPdf.toString('base64');
      const applicationBase64 = params.applicationPdf.toString('base64');

      // Create cancellation signature request with SES
      const cancellationRequest = await this.createSESSignatureRequest({
        title: `KVG Kündigung ${new Date().getFullYear()} - ${params.userData.firstName} ${params.userData.lastName}`,
        message: 'Bitte unterschreiben Sie diese wichtige KVG-Kündigung. Sie benötigen kein Skribble-Konto - klicken Sie einfach auf den Link in der E-Mail.',
        content: cancellationBase64,
        signerEmail: params.userData.email,
        accessToken: params.accessToken
      });

      // Create application signature request with SES
      const applicationRequest = await this.createSESSignatureRequest({
        title: `Krankenversicherungsantrag ${params.selectedInsurance.insurer} - ${params.userData.firstName} ${params.userData.lastName}`,
        message: 'Bitte unterschreiben Sie diesen Krankenversicherungsantrag. Sie benötigen kein Skribble-Konto - klicken Sie einfach auf den Link in der E-Mail.',
        content: applicationBase64,
        signerEmail: params.userData.email,
        accessToken: params.accessToken
      });

      return {
        cancellation: cancellationRequest,
        application: applicationRequest
      };

    } catch (error) {
      console.error('Error creating SES signature requests:', error);
      throw new Error(`Failed to create SES signature requests: ${error.message}`);
    }
  }

  /**
   * Create SES (Simple Electronic Signature) request with enhanced debugging
   */
  private async createSESSignatureRequest(params: {
    title: string;
    message: string;
    content: string;
    signerEmail: string;
    accessToken: string;
  }): Promise<{ requestId: string; signingUrl: string }> {
    
    console.log(`Creating Skribble SES signature request: ${params.title}`);

    try {
      const signatureUrl = `${this.config.baseUrl}/v2/signature-requests`;

      // SES REQUEST PAYLOAD - GUEST SIGNING WITHOUT SKRIBBLE ACCOUNT
      // Key: Use signer_identity_data instead of account_email for guest signing
      
      // OPTION 1: WITH VISUAL SIGNATURE (signature appears on PDF)
      // Requires position coordinates - adjust based on your PDF layout
      const requestPayloadWithVisual = {
        title: params.title,
        message: params.message,
        content: params.content,
        signatures: [
          {
            signer_identity_data: {
              email_address: params.signerEmail
            },
            // signature_standard: "ses",
            visual_signature: {
              type: "picture-and-text",
              position: {
                page: 1,           // First page
                x: 100,            // 100 points from left (~3.5cm)
                y: 150,            // 150 points from bottom (~5.3cm)
                width: 200,        // Signature box width
                height: 80         // Signature box height
              }
            }
          }
        ],
        quality: "SES",
        legislation: "ZERTES"
      };
      
      // OPTION 2: WITHOUT VISUAL SIGNATURE (cleaner, simpler)
      // Signature still applies cryptographically, just not visible on PDF
      // This is simpler and works well for insurance documents
      const requestPayloadWithoutVisual = {
        title: params.title,
        message: params.message,
        content: params.content,
        signatures: [
          {
            signer_identity_data: {
              email_address: params.signerEmail
            },
           
            // No visual_signature field = no visible signature on PDF
            // Document is still legally signed!
          }
        ],
        quality: "SES",
        legislation: "ZERTES"
      };
      
      // Choose which payload to use
      // Set to 'false' to disable visual signature (simpler, recommended for start)
      const useVisualSignature = false;
      const requestPayload = useVisualSignature 
        ? requestPayloadWithVisual 
        : requestPayloadWithoutVisual;

      console.log('Sending SES signature request to Skribble:', { 
        url: signatureUrl, 
        title: params.title,
        signerEmail: params.signerEmail,
        contentSize: params.content.length,
        payloadStructure: {
          hasTitle: !!requestPayload.title,
          hasMessage: !!requestPayload.message,
          hasContent: !!requestPayload.content,
          signaturesCount: requestPayload.signatures.length
        }
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

      console.log('SES signature request response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SES signature request error response:', errorText);
        
        // Try to parse error as JSON for more details
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Parsed error details:', errorJson);
        } catch (e) {
          console.error('Could not parse error as JSON');
        }
        
        if (response.status === 401) {
          throw new Error('Skribble authentication failed - check API credentials');
        } else if (response.status === 413) {
          throw new Error('PDF file too large for Skribble (max 25MB)');
        } else if (response.status === 422) {
          throw new Error('Invalid PDF format or corrupted file');
        } else if (response.status === 500) {
          throw new Error('Skribble server error - please try again in a few minutes');
        }
        
        throw new Error(`SES signature request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // LOG THE ENTIRE RESPONSE for debugging
      console.log('📋 FULL Skribble API Response:', JSON.stringify(result, null, 2));

      if (!result.id) {
        console.error('No request ID in response:', result);
        throw new Error('No request ID returned from Skribble');
      }

      // Try multiple ways to extract the signing URL
      let sesSigningUrl = '';
      
      // Method 1: Check signatures array (most common)
      if (result.signatures && result.signatures.length > 0) {
        sesSigningUrl = result.signatures[0].signing_url || '';
        console.log('Method 1 - Found signing URL in signatures[0]:', sesSigningUrl);
      }
      
      // Method 2: Check top-level signing_url
      if (!sesSigningUrl && result.signing_url) {
        sesSigningUrl = result.signing_url;
        console.log('Method 2 - Found signing URL at top level:', sesSigningUrl);
      }
      
      // Method 3: Check if there's a direct link or url field
      if (!sesSigningUrl && result.link) {
        sesSigningUrl = result.link;
        console.log('Method 3 - Found signing URL in link field:', sesSigningUrl);
      }
      
      if (!sesSigningUrl && result.url) {
        sesSigningUrl = result.url;
        console.log('Method 4 - Found signing URL in url field:', sesSigningUrl);
      }

      // If still no URL, log the entire response structure
      if (!sesSigningUrl) {
        console.error('❌ No signing URL found in response. Full response structure:');
        console.error('Response keys:', Object.keys(result));
        if (result.signatures && result.signatures.length > 0) {
          console.error('Signature object keys:', Object.keys(result.signatures[0]));
          console.error('Signature object:', result.signatures[0]);
        }
        
        // For debugging: Return a mock URL in development
        if (this.config.environment === 'sandbox' && process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Using mock signing URL for development/debugging');
          sesSigningUrl = `https://sign.skribble.com/mock/${result.id}`;
        } else {
          throw new Error(`No signing URL returned from Skribble. Response structure: ${JSON.stringify(result)}`);
        }
      }

      console.log(`✅ SES signature request created: ${result.id}`);
      console.log(`   Signature standard: SES (Simple Electronic Signature)`);
      console.log(`   Signing URL: ${sesSigningUrl}`);
      console.log(`   Response contained: ${Object.keys(result).join(', ')}`);

      return {
        requestId: result.id,
        signingUrl: sesSigningUrl
      };

    } catch (error) {
      console.error('Error creating SES signature request:', error);
      
      // Enhanced error message with more context
      if (error.message && error.message.includes('No signing URL')) {
        throw new Error(`Failed to create SES signature request: ${error.message}. This might indicate the signature request was created but Skribble's response format is different than expected. Check the logs for the full response structure.`);
      }
      
      throw new Error(`Failed to create SES signature request: ${error.message}`);
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

    const result = await response.json();
    
    console.log('Document status retrieved:', {
      documentId,
      status: result.status,
      signatureStandard: result.signatures?.[0]?.signature_standard,
      signedAt: result.signatures?.[0]?.signed_at
    });

    return result;
  }

  /**
   * Handle Skribble webhook
   */
  async handleWebhook(payload: any, signature: string): Promise<any> {
    console.log('Processing Skribble webhook:', {
      eventType: payload.event_type,
      documentId: payload.signature_request?.id,
      signatureStandard: payload.signature_request?.signatures?.[0]?.signature_standard
    });
    
    return { 
      processed: true, 
      action: payload.event_type || 'unknown',
      documentId: payload.signature_request?.id,
      signatureStandard: payload.signature_request?.signatures?.[0]?.signature_standard || 'unknown'
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

  console.log('Skribble configuration with SES support:', {
    environment: config.environment,
    baseUrl: config.baseUrl,
    hasApiKey: !!config.apiKey,
    hasUsername: !!config.username,
    signatureStandard: 'SES',
    noAccountRequired: true,
    noVerificationRequired: true
  });

  return config;
};