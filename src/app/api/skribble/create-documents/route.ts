import { NextRequest, NextResponse } from 'next/server';
import { SkribbleService, getSkribbleConfig } from '../../../../../services/SkribbleService';
import { createUserWithInsurance } from '../../../../lib/db-utils';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('=== SIMPLIFIED DOCUMENT CREATION (PDF GENERATION + EMAIL) ===');
  
  try {
    // Get Skribble configuration
    const skribbleConfig = getSkribbleConfig();
    console.log('Using simplified configuration:', {
      environment: skribbleConfig.environment,
      hasCredentials: !!skribbleConfig.apiKey && !!skribbleConfig.username
    });

    const body = await request.json();
    console.log('Received document creation request for user:', body.userData?.email);

    // Enhanced validation
    const validationErrors = validateRequestData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: `Validation failed: ${validationErrors.join(', ')}`,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // Extract and sanitize user data
    const userData = sanitizeUserData(body.userData);
    const selectedInsurance = sanitizeInsuranceData(body.selectedInsurance);

    console.log('Processing insurance switch (simplified mode):', {
      user: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      currentInsurer: userData.currentInsurer,
      newInsurer: selectedInsurance.insurer
    });

    // Step 1: Save user to database
    let userId = body.userId;
    if (!userId) {
      try {
        console.log('Creating user in database...');
        
        const completeUserData = {
          salutation: userData.salutation,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          birthDate: userData.birthDate,
          address: userData.address,
          postalCode: userData.postalCode,
          city: userData.city,
          nationality: userData.nationality,
          ahvNumber: userData.ahvNumber,
          currentInsurancePolicyNumber: userData.currentInsurancePolicyNumber,
          insuranceStartDate: userData.insuranceStartDate,
          interestedInConsultation: body.userData.interestedInConsultation || false,
          
          searchCriteria: body.searchCriteria || {
            postalCode: userData.postalCode,
            birthDate: userData.birthDate,
            franchise: selectedInsurance.franchise,
            accidentCoverage: selectedInsurance.accidentInclusion,
            currentModel: 'Standard',
            currentInsurer: userData.currentInsurer,
            newToSwitzerland: false
          },
          
          selectedInsurance: selectedInsurance,
          
          compliance: body.compliance || {
            informationArt45: true,
            agbAccepted: true,
            mandateAccepted: true,
            terminationAuthority: true,
            consultationInterest: body.userData.interestedInConsultation || false
          }
        };

        userId = await createUserWithInsurance(completeUserData);
        console.log('User created successfully with ID:', userId);
      } catch (dbError: any) {
        console.error('Database error:', dbError);
        return NextResponse.json(
          { 
            error: 'Failed to save user data',
            details: dbError.message,
            code: 'DATABASE_ERROR'
          },
          { status: 500 }
        );
      }
    }

    // Step 2: Handle file upload if provided
    if (body.idDocument) {
      try {
        console.log('Processing uploaded ID document...');
        await saveUploadedFile(body.idDocument, userId.toString(), userData.email);
        console.log('ID document saved successfully');
      } catch (fileError) {
        console.warn('File upload error (non-blocking):', fileError);
      }
    }

    // Step 3: Initialize simplified Skribble service
    console.log('Initializing simplified Skribble service...');
    const skribbleService = new SkribbleService(skribbleConfig);

    // Step 4: Test authentication only (skip other failing endpoints)
    const connectionTest = await skribbleService.testConnection();
    console.log('Skribble authentication test result:', connectionTest);
    
    if (!connectionTest) {
      console.warn('Skribble authentication failed, proceeding with local PDF generation only...');
    }

    // Step 5: Process documents (generate PDFs, skip Skribble signature requests)
    console.log('Processing documents in simplified mode...');
    
    let result;
    try {
      // Add userId to userData for file naming
      userData.userId = userId;
      
      result = await Promise.race([
        skribbleService.processSwissInsuranceSwitch(userData, selectedInsurance),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Processing timeout after 45 seconds')), 45000)
        )
      ]);
    } catch (processingError: any) {
      console.error('Document processing error:', processingError);
      
      if (processingError.message.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'Document processing timeout',
            details: 'Document generation took too long. Please try again.',
            code: 'TIMEOUT_ERROR'
          },
          { status: 408 }
        );
      } else {
        return NextResponse.json(
          { 
            error: 'Document processing failed',
            details: processingError.message,
            code: 'PROCESSING_ERROR'
          },
          { status: 500 }
        );
      }
    }

    console.log('Document processing completed successfully (simplified mode):', {
      sessionId: result.sessionId,
      mode: result.mode,
      documentPaths: result.documentPaths
    });

    // Step 6: Prepare documents for email delivery
    const emailDeliveryData = {
      userId: userId,
      email: userData.email,
      documents: ['cancellation', 'application'],
      deliveryMethods: {
        email: true,
        postal: false
      },
      recipientData: {
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        address: userData.address,
        postalCode: userData.postalCode,
        city: userData.city,
        currentInsurer: userData.currentInsurer,
        newInsurer: selectedInsurance.insurer
      }
    };

    // Step 7: Trigger email delivery in background (don't wait for it)
    triggerEmailDelivery(emailDeliveryData).catch(emailError => {
      console.error('Email delivery failed (non-blocking):', emailError);
    });

    // Step 8: Return success response
    return NextResponse.json({
      success: true,
      mode: 'simplified',
      userId: userId,
      documentId: result.cancellationDocumentId,
      applicationDocumentId: result.applicationDocumentId,
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
      documentPaths: result.documentPaths,
      message: `Documents created successfully and will be sent to ${userData.email}`,
      
      // Simplified compliance information
      compliance: {
        legalFramework: 'CH-KVG',
        signatureType: 'Digital',
        deliveryMethod: 'Email',
        retentionPeriod: '10 years',
        timezone: 'Europe/Zurich',
        mode: 'simplified'
      },
      
      // Document information
      documents: {
        cancellation: {
          id: result.cancellationDocumentId,
          title: `KVG Kündigung ${new Date().getFullYear()} - ${userData.firstName} ${userData.lastName}`,
          type: 'cancellation',
          currentInsurer: userData.currentInsurer,
          effectiveDate: '31.12.2024',
          status: 'generated'
        },
        application: {
          id: result.applicationDocumentId,
          title: `Krankenversicherungsantrag ${selectedInsurance.insurer} - ${userData.firstName} ${userData.lastName}`,
          type: 'application',
          newInsurer: selectedInsurance.insurer,
          startDate: userData.insuranceStartDate,
          premium: `CHF ${selectedInsurance.premium.toFixed(2)}`,
          status: 'generated'
        }
      },
      
      // Next steps
      nextSteps: {
        documentsReady: true,
        emailDelivery: 'in_progress',
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/insurance/confirmation?session=${result.sessionId}`,
        estimatedDeliveryTime: '5-10 minutes'
      }
    });

  } catch (error: any) {
    console.error('Document creation error:', error);
    
    let errorMessage = 'Failed to create documents';
    let errorCode = 'CREATION_ERROR';
    let statusCode = 500;
    
    // Categorize errors
    if (error.message.includes('SKRIBBLE_API_KEY') || error.message.includes('SKRIBBLE_USERNAME')) {
      errorMessage = 'Service configuration error';
      errorCode = 'CONFIG_ERROR';
    } else if (error.message.includes('validation')) {
      errorMessage = 'Validation failed';
      errorCode = 'VALIDATION_ERROR';
      statusCode = 400;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Processing timeout';
      errorCode = 'TIMEOUT_ERROR';
      statusCode = 408;
    } else if (error.message.includes('database')) {
      errorMessage = 'Database error';
      errorCode = 'DATABASE_ERROR';
      statusCode = 503;
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please contact support',
        code: errorCode,
        mode: 'simplified'
      },
      { status: statusCode }
    );
  }
}

/**
 * Trigger email delivery in background
 */
async function triggerEmailDelivery(emailDeliveryData: any): Promise<void> {
  try {
    console.log('Triggering email delivery for user:', emailDeliveryData.email);
    
    const deliveryResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/documents/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailDeliveryData)
    });

    if (deliveryResponse.ok) {
      console.log('Email delivery initiated successfully');
    } else {
      console.error('Email delivery failed:', await deliveryResponse.text());
    }
  } catch (error) {
    console.error('Error triggering email delivery:', error);
  }
}

/**
 * Validation functions (keeping existing logic)
 */
function validateRequestData(body: any): string[] {
  const errors: string[] = [];

  const requiredUserFields = [
    { path: 'userData.firstName', label: 'First name' },
    { path: 'userData.lastName', label: 'Last name' },
    { path: 'userData.email', label: 'Email address' },
    { path: 'userData.currentInsurer', label: 'Current insurance provider' }
  ];

  for (const field of requiredUserFields) {
    const value = field.path.split('.').reduce((obj, key) => obj?.[key], body);
    if (!value || (typeof value === 'string' && !value.trim())) {
      errors.push(`${field.label} is required`);
    }
  }

  if (!body.selectedInsurance?.insurer) {
    errors.push('Selected insurance provider is required');
  }

  if (body.userData?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.userData.email)) {
    errors.push('Invalid email format');
  }

  return errors;
}

function sanitizeUserData(userData: any) {
  return {
    salutation: userData.salutation || 'Herr',
    firstName: userData.firstName?.trim() || '',
    lastName: userData.lastName?.trim() || '',
    birthDate: userData.birthDate || '',
    phone: userData.phone?.trim() || '',
    email: userData.email?.toLowerCase().trim() || '',
    address: userData.address?.trim() || '',
    postalCode: userData.postalCode || extractPostalCode(userData.address || ''),
    city: userData.city || extractCity(userData.address || ''),
    nationality: userData.nationality?.trim() || 'swiss',
    ahvNumber: userData.ahvNumber?.trim() || null,
    currentInsurer: userData.currentInsurer?.trim() || '',
    currentInsurancePolicyNumber: userData.currentInsurancePolicyNumber?.trim() || null,
    insuranceStartDate: userData.insuranceStartDate || '01.01.2025'
  };
}

function sanitizeInsuranceData(insuranceData: any) {
  return {
    insurer: insuranceData.insurer?.trim() || '',
    tariffName: insuranceData.tariffName || 'Standard',
    premium: parseFloat(String(insuranceData.premium)) || 0,
    franchise: String(insuranceData.franchise || '300'),
    accidentInclusion: insuranceData.accidentInclusion || 'Mit Unfalldeckung',
    ageGroup: insuranceData.ageGroup || 'Adult',
    region: insuranceData.region || 'CH',
    fiscalYear: String(insuranceData.fiscalYear || '2025')
  };
}

function extractPostalCode(address: string): string {
  const match = address.match(/\b\d{4}\b/);
  return match ? match[0] : '';
}

function extractCity(address: string): string {
  const match = address.match(/\b\d{4}\s+(.+)$/);
  return match ? match[1].trim() : '';
}

async function saveUploadedFile(base64Data: string, userId: string, userEmail: string): Promise<string> {
  try {
    if (!base64Data) return '';

    const base64String = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64String, 'base64');
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'id-documents', userId);
    await mkdir(uploadsDir, { recursive: true });
    
    const fileName = `id_document_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    
    await writeFile(filePath, buffer);
    
    const relativePath = `/uploads/id-documents/${userId}/${fileName}`;
    console.log(`ID document saved for user ${userEmail} at: ${relativePath}`);
    
    return relativePath;
    
  } catch (error) {
    console.error('Error saving uploaded file:', error);
    throw new Error(`Failed to save uploaded file: ${error.message}`);
  }
}