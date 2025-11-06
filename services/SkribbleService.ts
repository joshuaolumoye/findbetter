// services/SkribbleService.ts - FIXED Visual Signature Page Issue
import { PDFTemplateManager } from './PDFTemplateManager';
import fs from 'fs';
import path from 'path';

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
  public expressJsData: Record<string, any> = {};

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



  // send payload to new server
  private async sendToExpress(payload: any): Promise<void> {
    if (!process.env.EXPRESS_BASE_URL) {
      console.warn('EXPRESS_BASE_URL not set. Skipping sending to Express.');
      return;
    }
    console.log("Payload to Express:", JSON.stringify(payload, null, 2));
    try {
      const res = await fetch(`${process.env.EXPRESS_BASE_URL}/api/signing-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log("\n\n==== SENDING TO EXPRESS ====\n\n")

      if (!res.ok) {
        const errorData = await res.text();
        console.error('Failed to send signing request to Express:', errorData);
      } else {
        console.log('✅ Payload sent to Express backend successfully');
      }
    } catch (err) {
      console.error('Error sending signing request to Express:', err);
    }
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
  /**
 * Process Swiss insurance switch using SES (Simple Electronic Signature)
 */
  async processSwissInsuranceSwitch(
    userData: any,
    selectedInsurance: any,
    isNewToSwitzerland: boolean = false
  ): Promise<any> {
    try {
      console.log("Processing Swiss insurance switch:", {
        userName: `${userData.firstName} ${userData.lastName}`,
        isNewToSwitzerland,
        willGenerateCancellation: !isNewToSwitzerland,
      });

      // Generate session ID
      const sessionId = `session_${Date.now()}`;
      this.expressJsData.sessionId = sessionId;
      this.expressJsData.isNewToSwitzerland = isNewToSwitzerland;
      console.log("🧩 Session initialized for Express:", this.expressJsData);

      // Validate user data
      if (!userData?.firstName || !userData?.lastName) {
        throw new Error("Invalid user data: Missing name information");
      }
      if (!userData?.email) {
        throw new Error("Invalid user data: Missing email");
      }

      // Validate insurance data
      if (!selectedInsurance?.insurer) {
        throw new Error("Invalid insurance data: Missing insurer information");
      }

      console.log(
        "Starting Swiss KVG insurance process with SES (Simple Electronic Signature)..."
      );

      // Validate Swiss requirements
      this.validateSwissRequirements(userData, selectedInsurance);

      console.log("Document generation strategy:", {
        isNewToSwitzerland,
        willGenerateCancellation: !isNewToSwitzerland,
        willGenerateApplication: true,
      });

      // Get access token
      const accessToken = await this.getAccessToken();

      // Adjust data for new-to-Switzerland users
      if (isNewToSwitzerland) {
        console.log("Processing for new-to-Switzerland user");
        userData = {
          ...userData,
          oldInsurer: "",
          insuranceStartDate: userData.insuranceStartDate || "2025-12-03",
        };
      }

      // Generate PDFs
      console.log("Generating KVG documents...");
      console.log("🔹 Insurance data for PDF generation:", {
        isNewToSwitzerland,
        oldInsurer: userData.oldInsurer || "None",
        currentInsurer: userData.currentInsurer,
        selectedInsurer: selectedInsurance.insurer,
        insuranceStartDate: userData.insuranceStartDate,
      });

      const applicationPdf = await this.pdfManager.generateInsuranceApplicationPDF(
        userData,
        selectedInsurance
      );
      let cancellationPdf = null;

      if (!isNewToSwitzerland && userData.oldInsurer) {
        cancellationPdf = await this.pdfManager.generateCancellationPDF(
          userData,
          userData.oldInsurer
        );
      }

      console.log(
        "PDFs generated successfully, creating Skribble SES signature requests..."
      );

      // Create signature requests
      let signatureRequests;

      if (isNewToSwitzerland || !userData.oldInsurer) {
        console.log("Creating application-only signature request...");
        const applicationRequest = await this.createSESSignatureRequest({
          title: `Krankenversicherungsantrag - ${userData.firstName} ${userData.lastName}`,
          message: isNewToSwitzerland
            ? "Please sign your initial Swiss insurance application"
            : "Please sign your new insurance application",
          content: applicationPdf.toString("base64"),
          signerEmail: userData.email,
          accessToken,
        });

        signatureRequests = {
          application: applicationRequest,
          cancellation: null,
        };
      } else {
        console.log("Creating both signature requests for insurance switch...");
        signatureRequests = await this.createBothSESSignatureRequests({
          cancellationPdf,
          applicationPdf,
          userData,
          selectedInsurance,
          accessToken,
        });
      }

      console.log("Signature requests created successfully");

      // Build response object
      const response: any = {
        success: true,
        sessionId,
        signatureStandard: "SES",
        applicationDocumentId: signatureRequests.application.requestId,
        applicationSigningUrl: signatureRequests.application.signingUrl,
        userEmail: userData.email,
        isNewToSwitzerland,
        insuranceStartDate: userData.insuranceStartDate,
        selectedInsurer: selectedInsurance.insurer,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        mode: "ses",
        documentType: isNewToSwitzerland ? "application_only" : "full_switch",
        instructions: isNewToSwitzerland
          ? "You will receive an email invitation to sign your new insurance application."
          : "You will receive email invitations to sign both the cancellation and application documents.",
      };

      // Add cancellation info if it exists
      if (signatureRequests.cancellation) {
        response.cancellationDocumentId = signatureRequests.cancellation.requestId;
        response.cancellationSigningUrl =
          signatureRequests.cancellation.signingUrl;
        response.currentInsurer = userData.currentInsurer;
      }

      // ✅ Send consolidated info to Express (always, before returning)
      try {
        const signingUrl = signatureRequests?.application.signingUrl || "";
        const documentId = signingUrl.split("/view/")[1]?.split("/")[0];

        const expressPayload = {
          userName: `${userData.firstName} ${userData.lastName}`,
          userEmail: userData.email,
          sessionId,
          applicationDocumentId: documentId,
          signingUrl: signatureRequests.application.signingUrl,
          isNewToSwitzerland,
          documentType: isNewToSwitzerland ? "application_only" : "full_switch",
        };

        await this.sendToExpress(expressPayload);
        console.log("✅ Sent consolidated signing info to Express once");
      } catch (err) {
        console.error("❌ Failed to send consolidated signing info to Express:", err);
      }

      // ✅ Return once — at the end
      return response;

    } catch (error) {
      console.error("Error processing Swiss insurance switch with Skribble SES:", error);
      throw new Error(`Failed to process KVG insurance switch: ${error.message}`);
    }
  }


  /**
   * Create both signature requests with SES
   */
  private async createBothSESSignatureRequests(params: {
    cancellationPdf: Buffer | null;
    applicationPdf: Buffer;
    userData: any;
    selectedInsurance: any;
    accessToken: string;
  }): Promise<{
    cancellation: { requestId: string; signingUrl: string } | null;
    application: { requestId: string; signingUrl: string };
  }> {

    console.log('Creating signature requests...');

    try {
      // Convert PDFs to base64
      const cancellationBase64 = params.cancellationPdf.toString('base64');
      const applicationBase64 = params.applicationPdf.toString('base64');

      // Create cancellation signature request with SES (NO visual signature)
      const cancellationRequest = await this.createSESSignatureRequest({
        title: `KVG Kündigung ${new Date().getFullYear()} - ${params.userData.firstName} ${params.userData.lastName}`,
        message: 'Bitte unterschreiben Sie diese wichtige KVG-Kündigung. Sie benötigen kein Skribble-Konto - klicken Sie einfach auf den Link in der E-Mail.',
        content: cancellationBase64,
        signerEmail: params.userData.email,
        accessToken: params.accessToken
      });

      // Create application signature request with SES (NO visual signature)
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
   * Create SES (Simple Electronic Signature) request WITHOUT visual signature
   * This avoids page reference errors and keeps the PDF clean
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

      // SES REQUEST PAYLOAD WITHOUT VISUAL SIGNATURE
      // This is the cleanest approach and avoids page reference errors
      const requestPayload = {
        title: params.title,
        message: params.message,
        content: params.content,
        signatures: [
          {
            signer_identity_data: {
              email_address: params.signerEmail
            }
            // NO visual_signature field = no visible signature on PDF
            // Document is still cryptographically signed with SES!
          }
        ],
        quality: "SES",
        legislation: "ZERTES",

        callback_url: 'https://abcd1234.ngrok.io/api/skribble/webhook',
        event_types: ['signature_request.completed'] // only notify on completion
      };

      console.log('Sending SES signature request to Skribble:', {
        url: signatureUrl,
        title: params.title,
        signerEmail: params.signerEmail,
        contentSize: params.content.length,
        quality: 'SES',
        legislation: 'ZERTES',
        hasVisualSignature: false
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
        } else if (response.status === 400) {
          throw new Error(`Bad request: ${errorText}`);
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
      console.log(`   Visual signature: None (clean PDF)`);
      console.log(`   Signing URL: ${sesSigningUrl}`);
      console.log(`   Response contained: ${Object.keys(result).join(', ')}`);

      const userEmail = result.signatures?.[0]?.signer_identity_data?.email_address || params.signerEmail;
      const signingUrl = result.signatures?.[0]?.signing_url || result.signing_url || '';
      const documentId = signingUrl.split('/view/')[1]?.split('/')[0];
      const fullNameFromTitle = result.title?.split(' - ').pop()?.trim() || 'Unknown';

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
    console.log('\n\n\n=========\n\n');
    console.log('Processing Skribble webhook:', payload.event_type);
    console.log('\n\n\n=========\n\n');

    const eventType = payload.event_type;
    const signatureRequestId = payload.signature_request?.id;
    console.log('signatureRequestId: ', signatureRequestId);

    if (eventType === 'signature_request.completed' && signatureRequestId) {
      console.log(`✅ SignatureRequest ${signatureRequestId} completed. Fetching document ID...`);

      try {
        const accessToken = await this.getAccessToken();

        // 1️⃣ Fetch the SignatureRequest to get the correct document_id
        const srResponse = await fetch(`${this.config.baseUrl}/v2/signature-requests/${signatureRequestId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'CompanioxApp/1.0'
          }
        });

        if (!srResponse.ok) throw new Error(`Failed to fetch SignatureRequest: ${srResponse.status}`);

        const srData = await srResponse.json();
        const documentId = srData.document_id;

        if (!documentId) throw new Error('Document ID not found in SignatureRequest');

        console.log(`📄 Document ID retrieved: ${documentId}. Downloading signed PDF...`);

        // 2️⃣ Download the actual signed PDF
        const pdfResponse = await fetch(`${this.config.baseUrl}/v2/documents/${documentId}/content`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'CompanioxApp/1.0'
          }
        });

        if (!pdfResponse.ok) throw new Error(`Download failed: ${pdfResponse.status}`);

        const signedPdf = Buffer.from(await pdfResponse.arrayBuffer());

        // 3️⃣ Ensure folder exists
        const dir = path.join(process.cwd(), 'public', 'signed_docs');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Created folder: ${dir}`);
        }

        // 4️⃣ Save PDF locally
        const filePath = path.join(dir, `${documentId}.pdf`);
        await fs.promises.writeFile(filePath, signedPdf);
        console.log(`✅ Signed document saved at: ${filePath}`);

        // Optionally update your DB
        // await db.query('UPDATE insurance_quotes SET signed_doc_path = ? WHERE document_id = ?', [filePath, signatureRequestId]);

        return { processed: true, action: eventType, signatureRequestId, documentId, storedAt: filePath };
      } catch (err) {
        console.error('Error fetching signed document:', err);
        return { processed: false, error: err.message };
      }
    }

    return { processed: true, action: eventType };
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
    visualSignature: false,
    noAccountRequired: true,
    noVerificationRequired: true
  });

  return config;
};