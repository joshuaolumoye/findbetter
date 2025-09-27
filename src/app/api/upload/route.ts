import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { saveUserDocument } from '../../../lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Missing file or userId' },
        { status: 400 }
      );
    }
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'documents');
    await mkdir(uploadDir, { recursive: true });
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}_${file.name}`;
    const filepath = join(uploadDir, filename);
    
    // Save file
    await writeFile(filepath, buffer);
    
    // Update database with file path
    const relativePath = `/uploads/documents/${filename}`;
    await saveUserDocument(parseInt(userId), relativePath);
    
    return NextResponse.json({
      success: true,
      filepath: relativePath,
      message: 'File uploaded successfully'
    });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}