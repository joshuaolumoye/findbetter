// app/api/skribble/create-documents/route.ts - FIXED FOR SERVER-SIDE ONLY
import { NextRequest, NextResponse } from 'next/server';
import { SkribbleService, getSkribbleConfig } from '../../../../../services/SkribbleService';
import { createUserWithInsurance } from '../../../../lib/db-utils';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('=== SKRIBBLE DOCUMENT CREATION (SERVER-SIDE ONLY) ===');
  
  try {
    // Get Skribble configuration with proper validation
    const skribbleConfig = getSkribbleConfig();
    console.log('Using Skribble configuration:', {
      environment: skribbleConfig.environment,
      baseUrl: skribbleConfig.baseUrl,
      hasCredentials: !!skribbleConfig.apiKey && !!skribbleConfig.username
    });

    const body = await request.json();
    console.log('Received document creation request for user:', body.userData?.email);

    // Enhanced validation with specific error messages
    const validationErrors = validateRequestData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: `Validation failed: ${validationErrors.join(', ')}`,
          code: 'VALIDATION_ERROR',
          mode: skribbleConfig.environment,
          validationErrors
        },
        { status: 400 }
      );
    }

    // Extract and sanitize user data
    const userData = sanitizeUserData(body.userData);
    const selectedInsurance = sanitizeInsuranceData(body.selectedInsurance);

    console.log('Processing insurance switch:', {
      user: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      currentInsurer: userData.currentInsurer,
      newInsurer: selectedInsurance.insurer,
      premium: selectedInsurance.premium,
      environment: skribbleConfig.environment
    });

    // Step 1: Save user to database first
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
            code: 'DATABASE_ERROR',
            mode: skribbleConfig.environment
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
        // Continue without failing the process
      }
    }

    // Step 3: Initialize Skribble service
    console.log('Initializing Skribble service...');
    const skribbleService = new SkribbleService(skribbleConfig);

    // Step 4: Test Skribble connection
    const connectionTest = await skribbleService.testConnection();
    console.log('Skribble connection test result:', connectionTest);
    
    if (!connectionTest) {
      return NextResponse.json(
        { 
          error: 'Skribble API connection failed',
          details: 'Unable to connect to digital signature service. Please try again later.',
          code: 'CONNECTION_ERROR',
          mode: skribbleConfig.environment
        },
        { status: 503 }
      );
    }

    // Step 5: Process Swiss insurance switch
    console.log('Processing Swiss KVG insurance switch through Skribble...');
    
    let result;
    try {
      result = await Promise.race([
        skribbleService.processSwissInsuranceSwitch(userData, selectedInsurance),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Processing timeout after 45 seconds')), 45000)
        )
      ]);
    } catch (processingError: any) {
      console.error('Skribble processing error:', processingError);
      
      // Handle specific error types
      if (processingError.message.includes('Access denied') || processingError.message.includes('403')) {
        return NextResponse.json(
          { 
            error: 'Digital signature service access denied',
            details: 'API credentials or permissions issue. Please contact support.',
            code: 'PERMISSION_ERROR',
            mode: skribbleConfig.environment
          },
          { status: 403 }
        );
      } else if (processingError.message.includes('404')) {
        return NextResponse.json(
          { 
            error: 'Digital signature service endpoint not found',
            details: 'API version or URL configuration issue. Please contact support.',
            code: 'ENDPOINT_ERROR',
            mode: skribbleConfig.environment
          },
          { status: 404 }
        );
      } else if (processingError.message.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'Document processing timeout',
            details: 'Document generation took too long. Please try again.',
            code: 'TIMEOUT_ERROR',
            mode: skribbleConfig.environment
          },
          { status: 408 }
        );
      } else {
        throw processingError; // Re-throw for generic error handling
      }
    }

    console.log('Swiss KVG insurance switch completed successfully:', {
      sessionId: result.sessionId,
      cancellationDocId: result.cancellationDocumentId,
      applicationDocId: result.applicationDocumentId,
      hasSigningUrl: !!result.redirectUrl
    });

    // Step 6: Return success response
    return NextResponse.json({
      success: true,
      mode: skribbleConfig.environment,
      userId: userId,
      documentId: result.cancellationDocumentId,
      applicationDocumentId: result.applicationDocumentId,
      signingUrl: result.redirectUrl,
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
      message: `Documents created successfully and ready for signing`,
      
      // Enhanced compliance information
      compliance: {
        legalFramework: 'CH-KVG',
        signatureType: skribbleConfig.environment === 'production' ? 'QES' : 'AES',
        retentionPeriod: '10 years',
        timezone: 'Europe/Zurich',
        environment: skribbleConfig.environment,
        apiVersion: 'v2'
      },
      
      // Document information
      documents: {
        cancellation: {
          id: result.cancellationDocumentId,
          title: `KVG Kündigung ${new Date().getFullYear()} - ${userData.firstName} ${userData.lastName}`,
          type: 'cancellation',
          currentInsurer: userData.currentInsurer,
          effectiveDate: '31.12.2024'
        },
        application: {
          id: result.applicationDocumentId,
          title: `Krankenversicherungsantrag ${selectedInsurance.insurer} - ${userData.firstName} ${userData.lastName}`,
          type: 'application',
          newInsurer: selectedInsurance.insurer,
          startDate: userData.insuranceStartDate,
          premium: `CHF ${selectedInsurance.premium.toFixed(2)}`
        }
      },
      
      // API information
      api: {
        skribbleBaseUrl: skribbleConfig.baseUrl,
        environment: skribbleConfig.environment,
        version: 'v2',
        authentication: 'JWT Bearer'
      }
    });

  } catch (error: any) {
    console.error('Document creation error:', error);
    
    // Enhanced error handling with specific messages
    let errorMessage = 'Failed to create documents';
    let errorCode = 'CREATION_ERROR';
    let statusCode = 500;
    
    // Categorize errors
    if (error.message.includes('SKRIBBLE_API_KEY') || error.message.includes('SKRIBBLE_USERNAME')) {
      errorMessage = 'Digital signature service configuration error';
      errorCode = 'CONFIG_ERROR';
      statusCode = 500;
    } else if (error.message.includes('authentication') || error.message.includes('login')) {
      errorMessage = 'Digital signature service authentication failed';
      errorCode = 'AUTH_ERROR';
      statusCode = 401;
    } else if (error.message.includes('Swiss KVG validation')) {
      errorMessage = 'Swiss KVG validation failed';
      errorCode = 'VALIDATION_ERROR';
      statusCode = 400;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Document creation timeout';
      errorCode = 'TIMEOUT_ERROR';
      statusCode = 408;
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'API rate limit reached. Please try again in a few minutes.';
      errorCode = 'RATE_LIMIT_ERROR';
      statusCode = 429;
    } else if (error.message.includes('database') || error.message.includes('Database')) {
      errorMessage = 'Database connection failed';
      errorCode = 'DATABASE_ERROR';
      statusCode = 503;
    }

    try {
      const skribbleConfig = getSkribbleConfig();
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: skribbleConfig.environment === 'sandbox' ? 
            error.message : 
            'Please contact support if the problem persists.',
          code: errorCode,
          mode: skribbleConfig.environment,
          api: {
            version: 'v2',
            environment: skribbleConfig.environment,
            baseUrl: skribbleConfig.baseUrl
          },
          timestamp: new Date().toISOString()
        },
        { status: statusCode }
      );
    } catch (configError) {
      // Fallback error response if config fails
      return NextResponse.json(
        { 
          error: 'Service configuration error',
          details: 'Critical service configuration issue',
          code: 'CONFIG_ERROR'
        },
        { status: 500 }
      );
    }
  }
}

/**
 * Validate request data with specific error messages
 */
function validateRequestData(body: any): string[] {
  const errors: string[] = [];

  // Required user data fields
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

  // Required insurance data fields
  if (!body.selectedInsurance?.insurer) {
    errors.push('Selected insurance provider is required');
  }

  // Email format validation
  if (body.userData?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.userData.email)) {
    errors.push('Invalid email format');
  }

  return errors;
}

/**
 * Sanitize user data with proper typing
 */
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

/**
 * Sanitize insurance data
 */
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

/**
 * Extract postal code from address string
 */
function extractPostalCode(address: string): string {
  const match = address.match(/\b\d{4}\b/);
  return match ? match[0] : '';
}

/**
 * Extract city from address string
 */
function extractCity(address: string): string {
  const match = address.match(/\b\d{4}\s+(.+)$/);
  return match ? match[1].trim() : '';
}

/**
 * Save uploaded file to server
 */
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