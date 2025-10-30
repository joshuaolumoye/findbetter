import { NextRequest, NextResponse } from 'next/server';
import { createUserWithInsurance, getAllUsers } from '../../../lib/db-utils';
import { checkDatabaseHealth } from '../../../lib/db-utils';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// CREATE USER - PRODUCTION MODE
export async function POST(request: NextRequest) {
  console.log('=== USER REGISTRATION START (PRODUCTION) ===');
  
  try {
    // Check database health first
    const isDbHealthy = await checkDatabaseHealth();
    if (!isDbHealthy) {
      console.error('Database health check failed');
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: 'Service temporarily unavailable',
          code: 'DB_CONNECTION_ERROR'
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    console.log('Received registration data for:', body.email);

    // Validate required fields
    const requiredFields = [
      'salutation', 'firstName', 'lastName', 'email', 'phone', 'birthDate', 
      'address', 'postalCode', 'selectedInsurance'
    ];

    const missingFields = requiredFields.filter(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], body);
      return !value || (typeof value === 'string' && !value.trim());
    });

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: `Please provide: ${missingFields.join(', ')}`,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { 
          error: 'Invalid email format',
          details: 'Please provide a valid email address',
          code: 'INVALID_EMAIL'
        },
        { status: 400 }
      );
    }

    // Validate Swiss postal code
    if (!/^\d{4}$/.test(body.postalCode)) {
      console.warn('Invalid postal code format:', body.postalCode);
    }

    // Extract city from address or use default
    const extractCity = (address: string): string => {
      if (!address) return '';
      const parts = address.split(',');
      return parts.length > 1 ? parts[parts.length - 1].trim() : '';
    };

    // Prepare complete user data with street field
    const userData = {
      salutation: body.salutation,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.toLowerCase().trim(),
      phone: body.phone.trim(),
      birthDate: body.birthDate,
      address: body.address.trim(),
      street: body.street?.trim() || null, // NEW: Street field
      postalCode: body.postalCode,
      city: extractCity(body.address) || body.city || '',
      canton: body.canton || null,
      nationality: body.nationality || 'swiss',
      ahvNumber: body.ahvNumber?.trim() || null,
      oldInsurer: body.oldInsurer?.trim() || null,
      currentInsurancePolicyNumber: body.currentInsurancePolicyNumber?.trim() || null,
      insuranceStartDate: body.insuranceStartDate || '01.01.2025',
      idDocumentPath: body.idDocument ? await saveBase64File(body.idDocument, body.email) : null,
      interestedInConsultation: Boolean(body.interestedInConsultation),
      
      searchCriteria: {
        postalCode: body.searchCriteria?.postalCode || body.postalCode,
        birthDate: body.searchCriteria?.birthDate || body.birthDate,
        franchise: body.searchCriteria?.franchise || body.selectedInsurance?.franchise || '300',
        accidentCoverage: body.searchCriteria?.accidentCoverage || body.selectedInsurance?.accidentInclusion || 'Mit Unfalldeckung',
        currentModel: body.searchCriteria?.currentModel || 'Standard',
        currentInsurer: body.searchCriteria?.currentInsurer || 'Unknown',
        newToSwitzerland: Boolean(body.searchCriteria?.newToSwitzerland || false)
      },
      
      selectedInsurance: {
        insurer: body.selectedInsurance.insurer,
        tariffName: body.selectedInsurance.tariffName || 'Standard',
        premium: parseFloat(String(body.selectedInsurance.premium)) || 0,
        franchise: String(body.selectedInsurance.franchise || '300'),
        accidentInclusion: body.selectedInsurance.accidentInclusion || 'Mit Unfalldeckung',
        ageGroup: body.selectedInsurance.ageGroup || 'Adult',
        region: body.selectedInsurance.region || 'CH',
        fiscalYear: String(body.selectedInsurance.fiscalYear || '2025')
      },
      
      compliance: {
        informationArt45: Boolean(body.compliance?.informationArt45 || body.informationArt45),
        agbAccepted: Boolean(body.compliance?.agbAccepted || body.agbAccepted),
        mandateAccepted: Boolean(body.compliance?.mandateAccepted || body.mandateAccepted),
        terminationAuthority: Boolean(body.compliance?.terminationAuthority || body.terminationAuthority),
        consultationInterest: Boolean(body.compliance?.consultationInterest || body.consultationInterest)
      }
    };

    console.log('Creating user with validated data...');

    // Create user in database with timeout protection
    const userId = await Promise.race([
      createUserWithInsurance(userData),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timeout')), 30000)
      )
    ]);

    console.log('User created successfully with ID:', userId);

    // Return success response
    return NextResponse.json({
      success: true,
      userId: userId,
      message: 'User registered successfully',
      user: {
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        selectedInsurance: userData.selectedInsurance.insurer
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('User registration error:', error);
    
    // // Handle specific database errors
    // if (error.message.includes('Duplicate entry') || error.message.includes('existiert bereits')) {
    //   return NextResponse.json(
    //     { 
    //       error: 'User already exists',
    //       details: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits',
    //       code: 'USER_EXISTS'
    //     },
    //     { status: 409 }
    //   );
    // }
    
    if (error.message.includes('timeout') || error.message.includes('connection')) {
      return NextResponse.json(
        { 
          error: 'Database timeout',
          details: 'Datenbankverbindung unterbrochen. Bitte versuchen Sie es erneut.',
          code: 'DATABASE_TIMEOUT'
        },
        { status: 408 }
      );
    }

    // Generic server error
    return NextResponse.json(
      { 
        error: 'Registration failed',
        details: process.env.NODE_ENV === 'production' 
          ? 'Ein unerwarteter Fehler ist aufgetreten. Bitte kontaktieren Sie den Support.'
          : error.message,
        code: 'REGISTRATION_ERROR'
      },
      { status: 500 }
    );
  }
}

// GET USERS - ADMIN ONLY
export async function GET(request: NextRequest) {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Helper function to save base64 file
async function saveBase64File(base64Data: string, userEmail: string): Promise<string | null> {
  try {
    if (!base64Data) return null;

    const { writeFile, mkdir } = await import('fs/promises');
    const path = await import('path');
    
    // Remove data URL prefix if present
    const base64String = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64String, 'base64');
    
    // Create directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
    await mkdir(uploadDir, { recursive: true });
    
    // Generate filename
    const fileName = `doc_${Date.now()}_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    
    // Save file
    await writeFile(filePath, buffer);
    
    return `/uploads/documents/${fileName}`;
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
}