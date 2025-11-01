// app/api/upload/dual-documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dualDocumentUploadManager } from '../../../../lib/dual-document-upload';

// Increase timeout for large file uploads
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('📄 [API] Dual document upload API called');
  
  try {
    // Support both JSON (base64) and multipart/form-data (binary files)
    let frontImage: string | undefined;
    let backImage: string | undefined;
    let userId: string | undefined;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // If the client sent files via FormData, read them and convert to base64
      try {
        const formData = await request.formData();
        const frontFile = formData.get('frontFile') as File | null;
        const backFile = formData.get('backFile') as File | null;
        userId = formData.get('userId')?.toString();

        if (frontFile instanceof File) {
          const frontBuf = Buffer.from(await frontFile.arrayBuffer());
          frontImage = `data:${frontFile.type};base64,${frontBuf.toString('base64')}`;
        } else if (formData.get('frontBase64')) {
          frontImage = formData.get('frontBase64')?.toString();
        }

        if (backFile instanceof File) {
          const backBuf = Buffer.from(await backFile.arrayBuffer());
          backImage = `data:${backFile.type};base64,${backBuf.toString('base64')}`;
        } else if (formData.get('backBase64')) {
          backImage = formData.get('backBase64')?.toString();
        }
      } catch (fmError: any) {
        console.error('❌ [API] Failed to parse multipart form-data:', fmError);
        return NextResponse.json(
          {
            success: false,
            error: 'Ungültiges Multipart-Formular oder Dateiübertragung fehlgeschlagen',
            code: 'INVALID_MULTIPART',
            details: process.env.NODE_ENV === 'development' ? fmError.message : undefined
          },
          { status: 400 }
        );
      }
    } else {
      // Parse request body with extended timeout and better error handling for JSON payloads
      let body: any;
      try {
        body = await Promise.race([
          request.json(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), 30000)
          )
        ]);
      } catch (parseError: any) {
        console.error('❌ [API] Failed to parse request body:', parseError);

        if (parseError.message === 'REQUEST_TIMEOUT') {
          return NextResponse.json(
            {
              success: false,
              error: 'Request timeout - Dateien sind möglicherweise zu groß',
              code: 'REQUEST_TIMEOUT'
            },
            { status: 408 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: 'Ungültiges Request-Format. Bitte versuchen Sie es erneut.',
            code: 'INVALID_REQUEST',
            details: process.env.NODE_ENV === 'development' ? parseError.message : undefined
          },
          { status: 400 }
        );
      }

      const parsed = body || {};
      frontImage = parsed.frontImage;
      backImage = parsed.backImage;
      userId = parsed.userId;
    }

    // STEP 1: Immediate validation (fail fast)
    if (!userId) {
      console.error('❌ [API] Missing userId');
      return NextResponse.json(
        { 
          success: false,
          error: 'Benutzer-ID fehlt',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    if (!frontImage || !backImage) {
      console.error('❌ [API] Missing image data');
      return NextResponse.json(
        { 
          success: false,
          error: 'Beide Dokumentenseiten (Vorder- und Rückseite) sind erforderlich',
          code: 'MISSING_IMAGES'
        },
        { status: 400 }
      );
    }

    // Validate that images are strings
    if (typeof frontImage !== 'string' || typeof backImage !== 'string') {
      console.error('❌ [API] Invalid image format');
      return NextResponse.json(
        { 
          success: false,
          error: 'Ungültiges Bildformat',
          code: 'INVALID_IMAGE_FORMAT'
        },
        { status: 400 }
      );
    }

    // STEP 2: Quick size estimation (base64 string length)
    const frontSizeEstimate = (frontImage.length * 3) / 4;
    const backSizeEstimate = (backImage.length * 3) / 4;
    const maxSize = 10 * 1024 * 1024; // 10MB

    console.log(`📊 [API] Size estimates - Front: ${(frontSizeEstimate / 1024 / 1024).toFixed(2)}MB, Back: ${(backSizeEstimate / 1024 / 1024).toFixed(2)}MB`);

    // Early rejection for obviously oversized files
    if (frontSizeEstimate > maxSize) {
      console.error(`❌ [API] Front image too large: ${(frontSizeEstimate / 1024 / 1024).toFixed(2)}MB`);
      return NextResponse.json(
        { 
          success: false,
          error: `Vorderseitendokument ist zu groß (${(frontSizeEstimate / 1024 / 1024).toFixed(2)}MB). Maximum: 10MB`,
          code: 'FILE_TOO_LARGE'
        },
        { status: 413 }
      );
    }

    if (backSizeEstimate > maxSize) {
      console.error(`❌ [API] Back image too large: ${(backSizeEstimate / 1024 / 1024).toFixed(2)}MB`);
      return NextResponse.json(
        { 
          success: false,
          error: `Rückseitendokument ist zu groß (${(backSizeEstimate / 1024 / 1024).toFixed(2)}MB). Maximum: 10MB`,
          code: 'FILE_TOO_LARGE'
        },
        { status: 413 }
      );
    }

    // STEP 3: Process upload with timeout protection
    console.log(`📄 [API] Processing upload for user ${userId}`);
    
    let result;
    try {
      result = await Promise.race([
        dualDocumentUploadManager.saveDualDocuments(
          frontImage,
          backImage,
          userId,
          true // Create combined PDF
        ),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('PROCESSING_TIMEOUT')), 45000)
        )
      ]);
    } catch (uploadError: any) {
      console.error('❌ [API] Upload processing error:', uploadError);
      
      if (uploadError.message === 'PROCESSING_TIMEOUT') {
        return NextResponse.json(
          { 
            success: false,
            error: 'Upload-Timeout. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
            code: 'PROCESSING_TIMEOUT'
          },
          { status: 408 }
        );
      }
      
      throw uploadError; // Re-throw to be caught by outer catch
    }

    // STEP 4: Handle result
    if (!result.success) {
      console.error('❌ [API] Upload failed:', result.error);
      
      // Determine status code based on error type
      let statusCode = 500;
      let errorCode = 'UPLOAD_FAILED';
      
      if (result.error?.includes('too large') || result.error?.includes('zu groß')) {
        statusCode = 413;
        errorCode = 'FILE_TOO_LARGE';
      } else if (result.error?.includes('Invalid') || result.error?.includes('Ungültig')) {
        statusCode = 400;
        errorCode = 'INVALID_FILE';
      } else if (result.error?.includes('format')) {
        statusCode = 400;
        errorCode = 'INVALID_FORMAT';
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Upload fehlgeschlagen',
          code: errorCode
        },
        { status: statusCode }
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ [API] Upload completed in ${processingTime}ms`);
    console.log(`📁 [API] Files: ${result.filenames?.front}, ${result.filenames?.back}`);

    return NextResponse.json({
      success: true,
      files: {
        front: result.frontPath,
        back: result.backPath,
        combined: result.combinedPath
      },
      filenames: result.filenames,
      sizes: result.sizes,
      processingTime,
      message: 'Dokumente erfolgreich hochgeladen'
    }, { status: 200 });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [API] Fatal error after ${processingTime}ms:`, error);
    
    // Handle specific error types
    let errorMessage = 'Upload fehlgeschlagen. Bitte versuchen Sie es erneut.';
    let statusCode = 500;
    let errorCode = 'UPLOAD_ERROR';

    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        errorMessage = 'Upload-Timeout. Datei möglicherweise zu groß oder Verbindung zu langsam.';
        statusCode = 408;
        errorCode = 'TIMEOUT';
      } else if (error.message.includes('too large') || error.message.includes('zu groß')) {
        errorMessage = 'Datei überschreitet die maximale Größe von 10MB.';
        statusCode = 413;
        errorCode = 'FILE_TOO_LARGE';
      } else if (error.message.includes('Invalid') || error.message.includes('Ungültig')) {
        errorMessage = 'Ungültiges Dateiformat. ' + error.message;
        statusCode = 400;
        errorCode = 'INVALID_FILE';
      } else if (error.message.includes('base64')) {
        errorMessage = 'Fehler beim Verarbeiten der Datei. Bitte versuchen Sie es erneut.';
        statusCode = 400;
        errorCode = 'INVALID_ENCODING';
      } else if (error.message.includes('ENOSPC')) {
        errorMessage = 'Nicht genügend Speicherplatz auf dem Server.';
        statusCode = 507;
        errorCode = 'INSUFFICIENT_STORAGE';
      } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
        errorMessage = 'Keine Berechtigung zum Schreiben der Datei.';
        statusCode = 500;
        errorCode = 'PERMISSION_DENIED';
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.stack : String(error)) : 
          undefined
      },
      { status: statusCode }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  try {
    await dualDocumentUploadManager.initializeDirectories();
    
    return NextResponse.json({
      status: 'healthy',
      maxFileSize: '10MB',
      allowedTypes: [
        'Images: JPG, PNG, GIF, WebP, BMP, TIFF',
        'Documents: PDF, Word, Excel, Text'
      ],
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}