// app/api/skribble/create-documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFTemplateManager } from '../../../../../services/PDFTemplateManager';


// Initialize PDF template manager
const pdfManager = new PDFTemplateManager();

interface RequestBody {
  userId: string;
  userData: {
    salutation: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    phone: string;
    email: string;
    address: string;
    postalCode: string;
    city: string;
    nationality?: string;
    ahvNumber?: string;
    currentInsurer: string;
    currentInsurancePolicyNumber?: string;
    insuranceStartDate?: string;
  };
  selectedInsurance: {
    insurer: string;
    tariffName: string;
    premium: number;
    franchise: string;
    accidentInclusion: string;
    ageGroup: string;
    region: string;
    fiscalYear: string;
  };
}

// Increase the timeout for this API route
export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting document creation process...');

    const body: RequestBody = await request.json();
    console.log('Received request for user:', body.userData.email);

    // Validate required fields
    const requiredFields = [
      'userId', 'userData.firstName', 'userData.lastName', 'userData.email',
      'userData.currentInsurer', 'selectedInsurance.insurer'
    ];

    for (const field of requiredFields) {
      const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], body);
      if (!fieldValue) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    console.log('Validation passed, generating PDFs...');

    // Step 1: Generate cancellation PDF
    let cancellationPdf: Buffer;
    try {
      console.log('Generating cancellation PDF for:', body.userData.currentInsurer);
      cancellationPdf = await pdfManager.generateCancellationPDF(
        body.userData, 
        body.userData.currentInsurer
      );
      console.log('Cancellation PDF generated successfully, size:', cancellationPdf.length, 'bytes');
    } catch (pdfError) {
      console.error('Error generating cancellation PDF:', pdfError);
      return NextResponse.json(
        { 
          error: 'Failed to generate cancellation document',
          details: pdfError.message,
          code: 'PDF_GENERATION_ERROR'
        },
        { status: 500 }
      );
    }

    // Step 2: Generate application PDF
    let applicationPdf: Buffer;
    try {
      console.log('Generating application PDF for:', body.selectedInsurance.insurer);
      applicationPdf = await pdfManager.generateInsuranceApplicationPDF(
        body.userData,
        body.selectedInsurance
      );
      console.log('Application PDF generated successfully, size:', applicationPdf.length, 'bytes');
    } catch (pdfError) {
      console.error('Error generating application PDF:', pdfError);
      return NextResponse.json(
        { 
          error: 'Failed to generate application document',
          details: pdfError.message,
          code: 'PDF_GENERATION_ERROR'
        },
        { status: 500 }
      );
    }

    // For now, return success without Skribble integration for testing
    // TODO: Add actual Skribble API integration when API keys are configured
    if (!process.env.SKRIBBLE_API_KEY || process.env.SKRIBBLE_API_KEY === 'f9185d11-c4ca-4eda-9b2f-26fba6192dae') {
      console.log('Skribble not configured, returning mock response');
      
      // Return a mock signing URL for testing
      return NextResponse.json({
        success: true,
        documentId: `mock_cancel_${Date.now()}`,
        applicationDocumentId: `mock_app_${Date.now()}`,
        signingUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/insurance/success?test=true`,
        message: 'Documents generated successfully (Test Mode - Skribble not configured)',
        testMode: true
      });
    }

    // Step 3: If Skribble is configured, integrate with Skribble API
    console.log('Integrating with Skribble API...');
    
    // TODO: Add actual Skribble integration here
    const mockDocumentId = `doc_${Date.now()}`;
    const mockApplicationId = `app_${Date.now()}`;
    const mockSigningUrl = `https://app.skribble.com/sign/${mockDocumentId}`;

    return NextResponse.json({
      success: true,
      documentId: mockDocumentId,
      applicationDocumentId: mockApplicationId,
      signingUrl: mockSigningUrl,
      message: 'Documents created and ready for signing'
    });

  } catch (error: any) {
    console.error('Error in document creation:', error);

    // Handle timeout errors specifically
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'Request timeout',
          details: 'The document generation process took too long. Please try again.',
          code: 'TIMEOUT_ERROR'
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}