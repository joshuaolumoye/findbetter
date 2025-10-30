// File: app/api/users/[id]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

interface UserDocument {
  type: 'pdf' | 'image';
  name: string;
  path: string;
  category: 'application' | 'cancellation' | 'id_front' | 'id_back' | 'id_combined';
  label: string;
  size: number;
  createdAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    console.log(`📄 Fetching documents for user ${userId}`);

    const documents: UserDocument[] = [];

    // Check ID documents directory
    const idDocsDir = path.join(process.cwd(), 'public', 'uploads', 'id-documents', userId);
    
    try {
      const files = await readdir(idDocsDir);
      console.log(`Found ${files.length} files in ID documents directory`);

      for (const file of files) {
        const filePath = path.join(idDocsDir, file);
        const fileStats = await stat(filePath);
        
        // Determine file type
        const ext = path.extname(file).toLowerCase();
        const type = ext === '.pdf' ? 'pdf' : 'image';
        
        // Determine category and label
        let category: UserDocument['category'];
        let label: string;
        
        if (file.includes('id_front')) {
          category = 'id_front';
          label = 'Ausweis Vorderseite';
        } else if (file.includes('id_back')) {
          category = 'id_back';
          label = 'Ausweis Rückseite';
        } else if (file.includes('id_combined')) {
          category = 'id_combined';
          label = 'Ausweis Kombiniert (PDF)';
        } else if (file.includes('application')) {
          category = 'application';
          label = 'Versicherungsantrag';
        } else if (file.includes('cancellation')) {
          category = 'cancellation';
          label = 'Kündigungsschreiben';
        } else {
          continue; // Skip unknown files
        }

        documents.push({
          type,
          name: file,
          path: `/uploads/id-documents/${userId}/${file}`,
          category,
          label,
          size: fileStats.size,
          createdAt: fileStats.birthtime.toISOString()
        });
      }

      // Sort documents: combined first, then front, then back, then others
      documents.sort((a, b) => {
        const order = { id_combined: 0, id_front: 1, id_back: 2, application: 3, cancellation: 4 };
        return order[a.category] - order[b.category];
      });

    } catch (error) {
      console.log(`No ID documents directory found for user ${userId}`);
    }

    // Check generated documents directory
    const generatedDocsDir = path.join(process.cwd(), 'public', 'uploads', 'generated-documents');
    
    try {
      const files = await readdir(generatedDocsDir);
      
      for (const file of files) {
        // Only include files that contain the user ID
        if (file.includes(userId) || file.includes(`user_${userId}`)) {
          const filePath = path.join(generatedDocsDir, file);
          const fileStats = await stat(filePath);
          
          let category: UserDocument['category'];
          let label: string;
          
          if (file.includes('application')) {
            category = 'application';
            label = 'Versicherungsantrag (Generiert)';
          } else if (file.includes('cancellation')) {
            category = 'cancellation';
            label = 'Kündigungsschreiben (Generiert)';
          } else {
            continue;
          }

          documents.push({
            type: 'pdf',
            name: file,
            path: `/uploads/generated-documents/${file}`,
            category,
            label,
            size: fileStats.size,
            createdAt: fileStats.birthtime.toISOString()
          });
        }
      }
    } catch (error) {
      console.log('No generated documents directory found');
    }

    console.log(`✅ Found ${documents.length} documents for user ${userId}`);

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length
    });

  } catch (error) {
    console.error('❌ Error fetching user documents:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : 'Unknown error',
        documents: []
      },
      { status: 500 }
    );
  }
}

// Download endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Security: Ensure the path is within allowed directories
    const allowedDirs = ['id-documents', 'generated-documents', 'user-files'];
    const isAllowed = allowedDirs.some(dir => filePath.includes(dir));
    
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const fullPath = path.join(process.cwd(), 'public', filePath);
    
    // Check if file exists
    try {
      await stat(fullPath);
    } catch {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const { readFile } = await import('fs/promises');
    const fileBuffer = await readFile(fullPath);
    
    const filename = path.basename(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}