// app/api/upload/dual-documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dualDocumentUploadManager } from '../../../../lib/dual-document-upload';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('📄 Dual document upload API called');
  
  try {
    const body = await request.json();
    const { frontImage, backImage, userId } = body;

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!frontImage || !backImage) {
      return NextResponse.json(
        { error: 'Both front and back images are required' },
        { status: 400 }
      );
    }

    console.log(`📄 Processing dual document upload for user ${userId}`);
    console.log(`📄 Front image size: ${frontImage.length} chars`);
    console.log(`📄 Back image size: ${backImage.length} chars`);

    // Save documents
    const result = await dualDocumentUploadManager.saveDualDocuments(
      frontImage,
      backImage,
      userId,
      true // Create combined PDF
    );

    if (!result.success) {
      console.error('❌ Upload failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }

    console.log('✅ Documents uploaded successfully:', result.filenames);

    return NextResponse.json({
      success: true,
      files: {
        front: result.frontPath,
        back: result.backPath,
        combined: result.combinedPath
      },
      filenames: result.filenames,
      sizes: result.sizes,
      message: 'Documents uploaded successfully'
    });

  } catch (error) {
    console.error('❌ Dual document upload error:', error);
    
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}