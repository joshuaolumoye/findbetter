// File: src/app/api/users/[id]/documents/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { getCurrentSession } from '@/lib/auth';

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
    // Verify admin session
    const admin = await getCurrentSession();
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = params.id;
    const documents: UserDocument[] = [];

    // Define document paths to check
    const userDocPath = path.join(process.cwd(), 'public', userId);
    const idDocPath = path.join(process.cwd(), 'public', 'uploads', 'id-documents', userId);

    console.log('Checking paths:');
    console.log('- User docs:', userDocPath);
    console.log('- ID docs:', idDocPath);

    // Check for generated PDFs (application and cancellation forms)
    try {
      const docFiles = await readdir(userDocPath);
      console.log('Found user docs:', docFiles);
      
      for (const file of docFiles) {
        const filePath = path.join(userDocPath, file);
        const fileStat = await stat(filePath);
        
        if (fileStat.isFile()) {
          let category: UserDocument['category'];
          let label: string;
          
          // More flexible matching for document names
          const lowerFile = file.toLowerCase();
          
          if (lowerFile.includes('application') || lowerFile.includes('anmelde')) {
            category = 'application';
            label = 'Anmeldeformular (Application Form)';
          } else if (lowerFile.includes('cancellation') || lowerFile.includes('kündigung')) {
            category = 'cancellation';
            label = 'Kündigungsschreiben (Cancellation Letter)';
          } else {
            // Include any PDF found in user folder
            if (file.endsWith('.pdf')) {
              category = 'application';
              label = file.replace('.pdf', '');
            } else {
              continue;
            }
          }
          
          documents.push({
            type: file.endsWith('.pdf') ? 'pdf' : 'image',
            name: file,
            path: `/${userId}/${file}`,
            category,
            label,
            size: fileStat.size,
            createdAt: fileStat.birthtime.toISOString()
          });
        }
      }
    } catch (error: any) {
      console.log(`No documents found in ${userDocPath}`, error.message);
    }

    // Check for ID card uploads
    try {
      const idFiles = await readdir(idDocPath);
      console.log('Found ID docs:', idFiles);
      
      for (const file of idFiles) {
        const filePath = path.join(idDocPath, file);
        const fileStat = await stat(filePath);
        
        if (fileStat.isFile()) {
          let category: UserDocument['category'];
          let label: string;
          
          const lowerFile = file.toLowerCase();
          
          if (lowerFile.includes('front') || lowerFile.includes('vorder')) {
            category = 'id_front';
            label = 'ID Karte (Vorderseite)';
          } else if (lowerFile.includes('back') || lowerFile.includes('rück')) {
            category = 'id_back';
            label = 'ID Karte (Rückseite)';
          } else if (lowerFile.includes('combined') || lowerFile.includes('komplett')) {
            category = 'id_combined';
            label = 'ID Karte (Kombiniert)';
          } else {
            continue;
          }
          
          const ext = path.extname(file).toLowerCase();
          documents.push({
            type: ext === '.pdf' ? 'pdf' : 'image',
            name: file,
            path: `/uploads/id-documents/${userId}/${file}`,
            category,
            label,
            size: fileStat.size,
            createdAt: fileStat.birthtime.toISOString()
          });
        }
      }
    } catch (error: any) {
      console.log(`No ID documents found in ${idDocPath}`, error.message);
    }

    // Sort documents by creation date (newest first)
    documents.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log(`Total documents found: ${documents.length}`);
    console.log('Documents:', documents.map(d => ({ name: d.name, path: d.path })));

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length
    });

  } catch (error: any) {
    console.error('Error fetching user documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: error.message },
      { status: 500 }
    );
  }
}