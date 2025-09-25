// app/api/skribble/sign-documents/route.ts - Production Mode
import { NextRequest, NextResponse } from 'next/server';
import { SkribbleService } from '../../../../../services/SkribbleService';
import { PDFTemplateManager } from '../../../../../services/PDFTemplateManager';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Skribble configuration for production
const skribbleConfig = {
  apiKey: process.env.SKRIBBLE_API_KEY || '',
  baseUrl: process.env.SKRIBBLE_BASE_URL || 'https://api.skribble.de',
  environment: process.env.NODE_ENV === 'production' ? 'production' as const : 'sandbox' as const,
  webhookSecret: process.env.SKRIBBLE_WEBHOOK_SECRET || ''
};

// Initialize services
const skribbleService = new SkribbleService(skribbleConfig);
const pdfManager = new PDFTemplateManager();

export async function POST(request: NextRequest) {
  console.log('Processing Skribble document signing request (Production Mode)...');
  
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.signer || !body.documents) {
      return NextResponse.json(
        { error: 'Missing required fields: signer or documents' },
        { status: 400 }
      );
    }

    // Validate Swiss requirements
    const signer = body.signer;
    if (!signer.email || !signer.firstName || !signer.lastName || !signer.birthDate) {
      return NextResponse.json(
        { error: 'Missing required signer information for Swiss KVG compliance' },
        { status: 400 }
      );
    }

    // Validate environment configuration
    if (!skribbleConfig.apiKey) {
      console.error('Skribble API key not configured');
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    console.log('Processing Swiss KVG insurance switch with Skribble...', {
      environment: skribbleConfig.environment,
      signerEmail: signer.email,
      documentCount: body.documents.length
    });

    // Extract user and insurance data from request
    const userData = {
      salutation: signer.salutation || 'Herr',
      firstName: signer.firstName,
      lastName: signer.lastName,
      birthDate: signer.birthDate,
      phone: signer.phone || '',
      email: signer.email,
      address: signer.address || '',
      postalCode: signer.postalCode || '',
      city: signer.city || '',
      nationality: signer.nationality || 'swiss',
      ahvNumber: signer.ahvNumber || '',
      currentInsurer: body.documents[0]?.data?.currentInsurer || 'Unknown',
      currentInsurancePolicyNumber: signer.policyNumber || null,
      insuranceStartDate: body.documents[1]?.insuranceData?.startDate || '01.01.2025'
    };

    const selectedInsurance = {
      insurer: body.documents[1]?.insuranceData?.insurer || 'New Insurance',
      tariffName: body.documents[1]?.insuranceData?.model || 'Standard',
      premium: parseFloat(body.documents[1]?.insuranceData?.premium || '0'),
      franchise: body.documents[1]?.insuranceData?.franchise || '300',
      accidentInclusion: body.documents[1]?.insuranceData?.accident || 'Mit Unfalldeckung',
      ageGroup: body.metadata?.ageGroup || '31-35',
      region: body.metadata?.region || 'Zurich',
      fiscalYear: body.metadata?.fiscalYear || '2025'
    };

    // Process Swiss insurance switch through Skribble
    const result = await skribbleService.processSwissInsuranceSwitch(
      userData,
      selectedInsurance
    );

    // Log successful processing
    console.log('Skribble processing completed successfully:', {
      sessionId: result.sessionId,
      cancellationDocId: result.cancellationDocumentId,
      applicationDocId: result.applicationDocumentId,
      expiresAt: result.expiresAt
    });

    // Return signing URL for redirection
    return NextResponse.json({
      success: true,
      signingUrl: result.redirectUrl,
      sessionId: result.sessionId,
      documentIds: [result.cancellationDocumentId, result.applicationDocumentId],
      expiresAt: result.expiresAt,
      message: 'Documents prepared successfully. Redirecting to Skribble for signing.',
      
      // Swiss compliance information
      compliance: {
        legalFramework: 'CH-KVG',
        signatureType: 'QES',
        retentionPeriod: '10 years',
        timezone: 'Europe/Zurich'
      },
      
      // Document information
      documents: {
        cancellation: {
          title: `KVG Kündigung ${new Date().getFullYear()} - ${userData.firstName} ${userData.lastName}`,
          type: 'cancellation',
          currentInsurer: userData.currentInsurer,
          effectiveDate: '31.12.2024'
        },
        application: {
          title: `Krankenversicherungsantrag ${selectedInsurance.insurer} - ${userData.firstName} ${userData.lastName}`,
          type: 'application',
          newInsurer: selectedInsurance.insurer,
          startDate: userData.insuranceStartDate,
          premium: `CHF ${selectedInsurance.premium.toFixed(2)}`
        }
      }
    });

  } catch (error: any) {
    console.error('Skribble processing error:', error);
    
    // Handle specific error types
    if (error.message.includes('validation failed')) {
      return NextResponse.json(
        { 
          error: 'Swiss KVG validation failed',
          details: error.message,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }
    
    if (error.message.includes('timeout') || error.message.includes('25 seconds')) {
      return NextResponse.json(
        { 
          error: 'Document generation timeout',
          details: 'PDF creation took too long. Please try again.',
          code: 'TIMEOUT_ERROR'
        },
        { status: 408 }
      );
    }
    
    if (error.message.includes('Skribble')) {
      return NextResponse.json(
        { 
          error: 'Digital signature service unavailable',
          details: 'Please try again in a few minutes.',
          code: 'SKRIBBLE_ERROR'
        },
        { status: 503 }
      );
    }

    // Generic server error
    return NextResponse.json(
      { 
        error: 'Failed to process documents',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please contact support if the problem persists.',
        code: 'PROCESSING_ERROR'
      },
      { status: 500 }
    );
  }
}

// Handle Skribble webhook for status updates
export async function PATCH(request: NextRequest) {
  console.log('Received Skribble webhook...');
  
  try {
    const body = await request.json();
    const signature = request.headers.get('x-skribble-signature') || '';
    
    // Process webhook
    const result = await skribbleService.handleWebhook(body, signature);
    
    console.log('Webhook processed:', result);
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      action: result.action
    });
    
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}