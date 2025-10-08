// app/api/upload/dual-documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import pool from '../../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { frontImage, backImage, userId } = body;
    
    if ((!frontImage && !backImage) || !userId) {
      return NextResponse.json(
        { error: 'Missing image(s) or userId' },
        { status: 400 }
      );
    }
    
    console.log(`📤 Starting dual document upload for user: ${userId}`);
    
    // Create uploads directory structure
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'id-documents');
    const userDir = join(uploadsDir, userId.toString());
    
    // Ensure directories exist
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    if (!existsSync(userDir)) {
      await mkdir(userDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const uploadedFiles: { front?: string; back?: string } = {};
    
    // Process front image
    if (frontImage) {
      try {
        // Remove data URL prefix if present
        const frontData = frontImage.includes('base64,') 
          ? frontImage.split('base64,')[1] 
          : frontImage;
        const frontBuffer = Buffer.from(frontData, 'base64');
        
        // Detect file extension from data URL or default to jpg
        let frontExt = 'jpg';
        if (frontImage.startsWith('data:')) {
          const mimeMatch = frontImage.match(/^data:image\/(\w+);base64,/);
          if (mimeMatch) {
            frontExt = mimeMatch[1];
          }
        }
        
        const frontFilename = `id_front_${timestamp}.${frontExt}`;
        const frontFilepath = join(userDir, frontFilename);
        
        await writeFile(frontFilepath, frontBuffer);
        uploadedFiles.front = `/uploads/id-documents/${userId}/${frontFilename}`;
        
        console.log(`✅ Front ID uploaded: ${frontFilename} (${frontBuffer.length} bytes)`);
      } catch (frontError) {
        console.error('❌ Front image upload error:', frontError);
        throw new Error(`Front image upload failed: ${frontError.message}`);
      }
    }
    
    // Process back image
    if (backImage) {
      try {
        // Remove data URL prefix if present
        const backData = backImage.includes('base64,') 
          ? backImage.split('base64,')[1] 
          : backImage;
        const backBuffer = Buffer.from(backData, 'base64');
        
        // Detect file extension from data URL or default to jpg
        let backExt = 'jpg';
        if (backImage.startsWith('data:')) {
          const mimeMatch = backImage.match(/^data:image\/(\w+);base64,/);
          if (mimeMatch) {
            backExt = mimeMatch[1];
          }
        }
        
        const backFilename = `id_back_${timestamp}.${backExt}`;
        const backFilepath = join(userDir, backFilename);
        
        await writeFile(backFilepath, backBuffer);
        uploadedFiles.back = `/uploads/id-documents/${userId}/${backFilename}`;
        
        console.log(`✅ Back ID uploaded: ${backFilename} (${backBuffer.length} bytes)`);
      } catch (backError) {
        console.error('❌ Back image upload error:', backError);
        throw new Error(`Back image upload failed: ${backError.message}`);
      }
    }
    
    // Save metadata to database
    try {
      await saveDocumentMetadataToDatabase(parseInt(userId), uploadedFiles);
      console.log(`✅ Document metadata saved to database for user ${userId}`);
    } catch (dbError) {
      console.error('⚠️ Database metadata save failed (non-critical):', dbError);
      // Don't fail the upload if database save fails
    }
    
    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: 'Documents uploaded successfully'
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload documents', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Save document file paths to database
 */
async function saveDocumentMetadataToDatabase(
  userId: number, 
  uploadedFiles: { front?: string; back?: string }
) {
  try {
    // Check if user_documents table exists, if not create it
    await ensureUserDocumentsTableExists();
    
    // Insert or update document paths
    const [result] = await pool.execute(
      `INSERT INTO user_documents (user_id, front_path, back_path, uploaded_at, created_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
         front_path = COALESCE(VALUES(front_path), front_path),
         back_path = COALESCE(VALUES(back_path), back_path),
         uploaded_at = NOW()`,
      [
        userId,
        uploadedFiles.front || null,
        uploadedFiles.back || null
      ]
    );
    
    // Also update the users table with document paths (for backward compatibility)
    const documentPathJson = JSON.stringify({
      front: uploadedFiles.front,
      back: uploadedFiles.back,
      uploadedAt: new Date().toISOString()
    });
    
    await pool.execute(
      `UPDATE users 
       SET id_document_path = ?, updated_at = NOW() 
       WHERE id = ?`,
      [documentPathJson, userId]
    );
    
    console.log(`✅ Document metadata saved for user ${userId}`);
    return result;
  } catch (error) {
    console.error('Database metadata error:', error);
    throw error;
  }
}

/**
 * Ensure user_documents table exists
 */
async function ensureUserDocumentsTableExists() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        front_path VARCHAR(500),
        back_path VARCHAR(500),
        document_type VARCHAR(50) DEFAULT 'id-card',
        uploaded_at DATETIME,
        created_at DATETIME,
        UNIQUE KEY unique_user_doc (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (error) {
    // Table might already exist, ignore error
    console.log('user_documents table check:', error.message);
  }
}

/**
 * GET endpoint to retrieve document URLs
 */
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

/**
 * Get user documents from database
 */
async function getUserDocuments(userId: number) {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT front_path, back_path, uploaded_at 
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
        uploadedAt: rows[0].uploaded_at
      };
    }
    
    // Fallback: try to get from users table
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
          uploadedAt: parsed.uploadedAt
        };
      } catch {
        // Invalid JSON, return null
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user documents:', error);
    throw error;
  }
}