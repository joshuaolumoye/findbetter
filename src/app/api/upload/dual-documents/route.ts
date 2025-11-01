// app/api/upload/dual-documents/route.ts
// Add these exports at the TOP of your route file

import { NextRequest, NextResponse } from 'next/server';
import { dualDocumentUploadManager } from '../../../../lib/dual-document-upload';

// ✅ CRITICAL: These configurations must be at the top level
export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic'; // Disable caching
export const runtime = 'nodejs'; // Use Node.js runtime (not Edge)

// ✅ For App Router (Next.js 13+), body size is controlled differently
// The actual limit is set in next.config.ts experimental.serverActions.bodySizeLimit

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('📄 [API] Dual document upload API called');
  
  try {
    // Parse request body with timeout protection
    const body = await Promise.race([
      request.json(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - body too large')), 30000)
      )
    ]) as any;

    const { frontImage, backImage, userId } = body;

    // STEP 1: Immediate validation (fail fast)
    if (!userId) {
      console.error('❌ [API] Missing userId');
      return NextResponse.json(
        { 
          success: false,
          error: 'User ID is required',
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
          error: 'Both front and back images are required',
          code: 'MISSING_IMAGES'
        },
        { status: 400 }
      );
    }

    // STEP 2: Quick size estimation (base64 string length)
    const frontSizeEstimate = (frontImage.length * 3) / 4; // Rough base64 to bytes
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
    
    const result = await Promise.race([
      dualDocumentUploadManager.saveDualDocuments(
        frontImage,
        backImage,
        userId,
        true // Create combined PDF
      ),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Upload processing timeout')), 45000)
      )
    ]);

    // STEP 4: Handle result
    if (!result.success) {
      console.error('❌ [API] Upload failed:', result.error);
      
      // Return specific error with appropriate status code
      const statusCode = result.error?.includes('too large') || result.error?.includes('zu groß') ? 413 : 500;
      
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Upload fehlgeschlagen',
          code: statusCode === 413 ? 'FILE_TOO_LARGE' : 'UPLOAD_FAILED'
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

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [API] Fatal error after ${processingTime}ms:`, error);
    
    // Handle specific error types
    let errorMessage = 'Upload fehlgeschlagen';
    let statusCode = 500;
    let errorCode = 'UPLOAD_ERROR';

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Upload-Timeout - Datei möglicherweise zu groß oder Verbindung zu langsam';
        statusCode = 408;
        errorCode = 'TIMEOUT';
      } else if (error.message.includes('too large') || error.message.includes('zu groß')) {
        errorMessage = 'Datei überschreitet die maximale Größe von 10MB';
        statusCode = 413;
        errorCode = 'FILE_TOO_LARGE';
      } else if (error.message.includes('Invalid') || error.message.includes('Ungültig')) {
        errorMessage = error.message;
        statusCode = 400;
        errorCode = 'INVALID_FILE';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : String(error) : undefined
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
      allowedTypes: ['JPG', 'PNG', 'GIF', 'WebP', 'PDF', 'DOC', 'DOCX'],
      timestamp: new Date().toISOString()
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