import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { saveUserDocument } from '../../../lib/db-utils';
import pool from '../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const frontFile = formData.get('frontFile') as File;
    const backFile = formData.get('backFile') as File;
    const userId = formData.get('userId') as string;
    const documentType = formData.get('documentType') as string || 'id-card';
    
    if ((!frontFile && !backFile) || !userId) {
      return NextResponse.json(
        { error: 'Missing file(s) or userId' },
        { status: 400 }
      );
    }
    
    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'documents', userId);
    await mkdir(uploadDir, { recursive: true });
    
    const timestamp = Date.now();
    const uploadedFiles: { front?: string; back?: string } = {};
    
    // Upload front side
    if (frontFile) {
      const frontBytes = await frontFile.arrayBuffer();
      const frontBuffer = Buffer.from(frontBytes);
      
      const frontFilename = `${userId}_${timestamp}_front_${frontFile.name}`;
      const frontFilepath = join(uploadDir, frontFilename);
      
      await writeFile(frontFilepath, frontBuffer);
      uploadedFiles.front = `/uploads/documents/${userId}/${frontFilename}`;
      
      console.log(`✅ Front uploaded: ${frontFilename} (${frontBuffer.length} bytes)`);
    }
    
    // Upload back side
    if (backFile) {
      const backBytes = await backFile.arrayBuffer();
      const backBuffer = Buffer.from(backBytes);
      
      const backFilename = `${userId}_${timestamp}_back_${backFile.name}`;
      const backFilepath = join(uploadDir, backFilename);
      
      await writeFile(backFilepath, backBuffer);
      uploadedFiles.back = `/uploads/documents/${userId}/${backFilename}`;
      
      console.log(`✅ Back uploaded: ${backFilename} (${backBuffer.length} bytes)`);
    }
    
    // FIXED: Save to database with correct parameters
    // The saveUserDocument function only accepts userId and a single documentPath string
    // We'll store a JSON string with both paths
    const documentPaths = JSON.stringify({
      front: uploadedFiles.front,
      back: uploadedFiles.back,
      type: documentType,
      uploadedAt: new Date().toISOString()
    });
    
    await saveUserDocument(parseInt(userId), documentPaths);
    
    // Also update a separate documents metadata table if you want more structure
    await saveDocumentMetadata(parseInt(userId), uploadedFiles, documentType);
    
    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: 'Documents uploaded successfully'
    });
    
  } catch (error) {
    console.error('❌ Error uploading documents:', error);
    return NextResponse.json(
      { error: 'Failed to upload documents', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to save document metadata in a separate table
async function saveDocumentMetadata(
  userId: number, 
  uploadedFiles: { front?: string; back?: string },
  documentType: string
) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO user_documents (user_id, front_path, back_path, document_type, uploaded_at, created_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
         front_path = VALUES(front_path),
         back_path = VALUES(back_path),
         uploaded_at = NOW()`,
      [
        userId,
        uploadedFiles.front || null,
        uploadedFiles.back || null,
        documentType
      ]
    );
    
    console.log(`✅ Document metadata saved for user ${userId}`);
  } catch (error) {
    console.error('⚠️ Failed to save document metadata:', error);
    // Don't throw - metadata is optional
  }
}

// GET endpoint to retrieve document URLs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }
    
    // Retrieve document paths from database
    const documents = await getUserDocuments(parseInt(userId));
    
    return NextResponse.json({
      success: true,
      documents
    });
    
  } catch (error) {
    console.error('❌ Error retrieving documents:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
}

async function getUserDocuments(userId: number) {
  try {
    // Try to get from metadata table first
    const [rows] = await pool.execute<any[]>(
      `SELECT front_path, back_path, document_type, uploaded_at 
       FROM user_documents 
       WHERE user_id = ? 
       ORDER BY uploaded_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    if (rows.length > 0) {
      return {
        front: rows[0].front_path,
        back: rows[0].back_path,
        type: rows[0].document_type,
        uploadedAt: rows[0].uploaded_at
      };
    }
    
    // Fallback: check users table
    const [userRows] = await pool.execute<any[]>(
      `SELECT id_document_path FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    
    if (userRows.length > 0 && userRows[0].id_document_path) {
      try {
        const parsed = JSON.parse(userRows[0].id_document_path);
        return {
          front: parsed.front,
          back: parsed.back,
          type: parsed.type || 'id-card',
          uploadedAt: parsed.uploadedAt
        };
      } catch {
        return {
          front: userRows[0].id_document_path,
          back: null,
          type: 'id-card',
          uploadedAt: null
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Error fetching user documents:', error);
    throw error;
  }
}