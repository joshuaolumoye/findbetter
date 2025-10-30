// app/api/skribble/create-documents/route.ts - FIXED WITH OLD_INSURER
import { NextRequest, NextResponse } from 'next/server';
import { SkribbleService, getSkribbleConfig } from '../../../../../services/SkribbleService';
import { getUserDetails } from '../../../../lib/db-utils';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('=== DOCUMENT CREATION WITH OLD INSURER FIX ===');
  
  try {
    if (!request?.body) {
      console.error('No request body provided');
      return NextResponse.json({
        error: 'Invalid request',
        details: 'No request body provided',
        code: 'INVALID_REQUEST'
      }, { status: 400 });
    }
    const skribbleConfig = getSkribbleConfig();
    console.log('Using configuration:', {
      environment: skribbleConfig.environment,
      hasCredentials: !!skribbleConfig.apiKey && !!skribbleConfig.username,
      apiKeyLength: skribbleConfig.apiKey?.length || 0,
      usernameLength: skribbleConfig.username?.length || 0
    });

    // Validate Skribble configuration
    if (!skribbleConfig.apiKey || !skribbleConfig.username) {
      console.error('❌ Missing Skribble credentials');
      return NextResponse.json(
        { 
          error: 'Service configuration error',
          details: 'Skribble credentials are not configured properly',
          code: 'CONFIG_ERROR'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'User ID is required',
          details: 'Please provide a valid userId',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    console.log('Processing documents for user ID:', userId);

    // STEP 1: Fetch user data from database
    console.log('STEP 1: Fetching user data from database...');
    const userDetails = await getUserDetails(parseInt(userId));
    
    if (!userDetails.user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          details: `No user found with ID ${userId}`,
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const user = userDetails.user;
    const quotes = userDetails.quotes || [];
    const selectedQuote = quotes.length > 0 ? quotes[0] : null;

    if (!selectedQuote) {
      return NextResponse.json(
        { 
          error: 'No insurance quote found',
          details: 'User has no associated insurance quote',
          code: 'NO_QUOTE_FOUND'
        },
        { status: 404 }
      );
    }

    console.log('✅ User data loaded:', {
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      address: user.address,
      street: user.street || 'not provided',
      oldInsurer: user.old_insurer, // ✅ OLD INSURER from database
      selectedInsurer: selectedQuote.selected_insurer // ✅ NEW INSURER from quote
    });

    // ✅ CRITICAL FIX: Include oldInsurer field from database
    console.log('🔹 OLD INSURER from database:', user.old_insurer);
    console.log('🔹 NEW INSURER from quote:', selectedQuote.selected_insurer);

    // STEP 2: Prepare user data for document generation - WITH OLD_INSURER
    const userData = {
      userId: userId,
      salutation: user.salutation,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      birthDate: user.birth_date,
      address: user.address,
      street: user.street || '',
      postalCode: user.postal_code,
      city: user.city,
      canton: user.canton,
      nationality: user.nationality,
      ahvNumber: user.ahv_number,
      oldInsurer: user.old_insurer || '', // ✅ OLD INSURER (being cancelled) - CODE like "1507"
      currentInsurer: selectedQuote.selected_insurer || 'Unknown', // ✅ NEW INSURER (selected)
      currentInsurancePolicyNumber: user.current_insurance_policy_number,
      insuranceStartDate: user.insurance_start_date
    };

    // Log the critical insurance information
    console.log('🔹 Insurance information for PDF generation:', {
      oldInsurer: userData.oldInsurer, // Will appear on cancellation PDF (right side)
      currentInsurer: userData.currentInsurer, // NEW insurer
      oldInsurerType: typeof userData.oldInsurer,
      currentInsurerType: typeof userData.currentInsurer
    });

    const fullAddress = userData.street 
      ? `${userData.address} ${userData.street}`.trim()
      : userData.address;
    
    console.log('Full address for PDF:', fullAddress);

    const selectedInsurance = {
      insurer: selectedQuote.selected_insurer, // ✅ NEW INSURER
      tariffName: selectedQuote.selected_tariff_name,
      premium: parseFloat(selectedQuote.selected_premium) || 0,
      franchise: selectedQuote.selected_franchise,
      accidentInclusion: selectedQuote.selected_accident_inclusion,
      ageGroup: selectedQuote.selected_age_group,
      region: selectedQuote.selected_region,
      fiscalYear: selectedQuote.selected_fiscal_year
    };

    console.log('🔹 Selected insurance (NEW insurer):', {
      insurer: selectedInsurance.insurer,
      premium: selectedInsurance.premium
    });

    // STEP 3: Initialize Skribble service
    console.log('STEP 2: Initializing Skribble service...');
    const skribbleService = new SkribbleService(skribbleConfig);

    // CRITICAL: Test authentication BEFORE processing
    console.log('🔐 Testing Skribble authentication...');
    const connectionTest = await skribbleService.testConnection();
    console.log('Skribble authentication result:', connectionTest);
    
    if (!connectionTest) {
      console.error('❌ Skribble authentication failed - cannot proceed');
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          details: 'Unable to authenticate with Skribble. Please verify API credentials.',
          code: 'AUTH_ERROR',
          troubleshooting: {
            checkApiKey: 'Verify SKRIBBLE_API_KEY is correct',
            checkUsername: 'Verify SKRIBBLE_USERNAME is correct',
            checkEnvironment: 'Confirm you are using the correct environment (testing/production)'
          }
        },
        { status: 401 }
      );
    }

    console.log('✅ Skribble authentication successful');

    // STEP 4: Process documents based on user status
    console.log('STEP 3: Processing documents...');
    // Check if user is new to Switzerland from the request body
    const isNewToSwitzerland = body.newToSwitzerland === true;
    
    console.log('Document generation strategy:', {
      isNewToSwitzerland,
      willGenerateCancellation: !isNewToSwitzerland,
      oldInsurer: isNewToSwitzerland ? 'N/A' : userData.oldInsurer
    });
    
    let result;
    try {
      console.log('📄 Starting document processing with timeout...');
      result = await Promise.race([
        skribbleService.processSwissInsuranceSwitch(
          userData, 
          selectedInsurance,
          isNewToSwitzerland
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Processing timeout after 45 seconds')), 45000)
        )
      ]);
      
      console.log('✅ Document processing completed:', {
        sessionId: result.sessionId,
        mode: result.mode,
        documentPaths: result.documentPaths
      });
      
    } catch (processingError: any) {
      console.error('❌ Document processing error:', {
        message: processingError.message,
        stack: processingError.stack,
        name: processingError.name
      });
      
      // Enhanced error categorization
      if (processingError.message.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'Document processing timeout',
            details: 'Document generation took too long. Please try again.',
            code: 'TIMEOUT_ERROR'
          },
          { status: 408 }
        );
      } 
      
      if (processingError.message.includes('Skribble server error')) {
        return NextResponse.json(
          { 
            error: 'Skribble service unavailable',
            details: 'The signature service is temporarily unavailable. Please try again in a few minutes.',
            code: 'SKRIBBLE_SERVER_ERROR',
            troubleshooting: {
              retryAfter: '2-5 minutes',
              checkStatus: 'Visit Skribble status page',
              contact: 'Contact Skribble support if error persists'
            }
          },
          { status: 503 }
        );
      }
      
      if (processingError.message.includes('authentication') || 
          processingError.message.includes('unauthorized') ||
          processingError.message.includes('401')) {
        return NextResponse.json(
          { 
            error: 'Authentication error',
            details: 'Failed to authenticate with Skribble API',
            code: 'AUTH_ERROR'
          },
          { status: 401 }
        );
      }
      
      if (processingError.message.includes('validation') || 
          processingError.message.includes('invalid')) {
        return NextResponse.json(
          { 
            error: 'Validation error',
            details: processingError.message,
            code: 'VALIDATION_ERROR'
          },
          { status: 400 }
        );
      }
      
      // Generic processing error
      return NextResponse.json(
        { 
          error: 'Document processing failed',
          details: processingError.message,
          code: 'PROCESSING_ERROR'
        },
        { status: 500 }
      );
    }

    // STEP 5: Prepare documents for email delivery
    const emailDeliveryData = {
      userId: userId,
      email: userData.email,
      documents: isNewToSwitzerland ? ['application'] : ['cancellation', 'application'],
      deliveryMethods: {
        email: true,
        postal: false
      },
      recipientData: {
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        address: fullAddress,
        postalCode: userData.postalCode,
        city: userData.city,
        oldInsurer: userData.oldInsurer, // ✅ OLD INSURER being cancelled
        currentInsurer: userData.currentInsurer, // For reference
        newInsurer: selectedInsurance.insurer // ✅ NEW INSURER selected
      }
    };

    // STEP 6: Return success response
    return NextResponse.json({
      success: true,
      mode: result.mode || 'simplified',
      userId: userId,
      documentId: result.cancellationDocumentId,
      applicationDocumentId: result.applicationDocumentId,
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
      documentPaths: result.documentPaths,
      message: `Documents created successfully with full address and will be sent to ${userData.email}`,
      
      compliance: {
        legalFramework: 'CH-KVG',
        signatureType: 'Digital',
        deliveryMethod: 'Email',
        retentionPeriod: '10 years',
        timezone: 'Europe/Zurich',
        mode: result.mode || 'simplified',
        addressFormat: fullAddress
      },
      
      documents: {
        cancellation: {
          id: result.cancellationDocumentId,
          title: `KVG Kündigung ${new Date().getFullYear()} - ${userData.firstName} ${userData.lastName}`,
          type: 'cancellation',
          oldInsurer: userData.oldInsurer, // ✅ OLD INSURER (being cancelled)
          currentInsurer: userData.currentInsurer,
          effectiveDate: '31.12.2025',
          status: 'generated',
          address: fullAddress
        },
        application: {
          id: result.applicationDocumentId,
          title: `Krankenversicherungsantrag ${selectedInsurance.insurer} - ${userData.firstName} ${userData.lastName}`,
          type: 'application',
          newInsurer: selectedInsurance.insurer, // ✅ NEW INSURER
          startDate: userData.insuranceStartDate,
          premium: `CHF ${selectedInsurance.premium.toFixed(2)}`,
          status: 'generated',
          address: fullAddress
        }
      },
      
      nextSteps: {
        documentsReady: true,
        emailDelivery: 'in_progress',
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/insurance/confirmation?session=${result.sessionId}`,
        estimatedDeliveryTime: '5-10 minutes'
      }
    });

  } catch (error: any) {
    console.error('❌ Document creation error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
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
    } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      errorMessage = 'Authentication error';
      errorCode = 'AUTH_ERROR';
      statusCode = 401;
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