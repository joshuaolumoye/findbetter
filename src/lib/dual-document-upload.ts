import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument } from 'pdf-lib';

export interface DualFileUploadResult {
  success: boolean;
  frontPath?: string;
  backPath?: string;
  combinedPath?: string;
  error?: string;
  filenames?: {
    front?: string;
    back?: string;
    combined?: string;
  };
  sizes?: {
    front?: number;
    back?: number;
    combined?: number;
  };
}

export class DualDocumentUploadManager {
  private uploadsDir: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private allowedTypes: string[] = [
    'application/pdf',
    'image/jpeg', 
    'image/png', 
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  }

  /**
   * Save both front and back sides of ID document
   */
  async saveDualDocuments(
    frontBase64: string,
    backBase64: string,
    userId: string,
    createCombinedPDF: boolean = true
  ): Promise<DualFileUploadResult> {
    try {
      console.log(`📄 Starting dual document upload for user ${userId}`);

      // Create user directory
      const userDir = path.join(this.uploadsDir, 'id-documents', userId);
      await mkdir(userDir, { recursive: true });

      const timestamp = Date.now();
      const uniqueId = uuidv4().substring(0, 8);
      
      // Process front side
      const frontResult = await this.processSingleDocument(
        frontBase64,
        userDir,
        `id_front_${timestamp}_${uniqueId}`
      );

      if (!frontResult.success) {
        return { success: false, error: `Front upload failed: ${frontResult.error}` };
      }

      // Process back side
      const backResult = await this.processSingleDocument(
        backBase64,
        userDir,
        `id_back_${timestamp}_${uniqueId}`
      );

      if (!backResult.success) {
        return { success: false, error: `Back upload failed: ${backResult.error}` };
      }

      const result: DualFileUploadResult = {
        success: true,
        frontPath: `/uploads/id-documents/${userId}/${frontResult.filename}`,
        backPath: `/uploads/id-documents/${userId}/${backResult.filename}`,
        filenames: {
          front: frontResult.filename,
          back: backResult.filename
        },
        sizes: {
          front: frontResult.size,
          back: backResult.size
        }
      };

      // Create combined PDF if requested and both files are images or PDFs
      if (createCombinedPDF && (frontResult.canBeCombined && backResult.canBeCombined)) {
        const combinedResult = await this.createCombinedPDF(
          path.join(userDir, frontResult.filename!),
          path.join(userDir, backResult.filename!),
          userDir,
          `id_combined_${timestamp}_${uniqueId}.pdf`
        );

        if (combinedResult.success) {
          result.combinedPath = `/uploads/id-documents/${userId}/${combinedResult.filename}`;
          result.filenames!.combined = combinedResult.filename;
          result.sizes!.combined = combinedResult.size;
        }
      }

      console.log(`✅ Dual documents uploaded successfully for user ${userId}`);
      return result;

    } catch (error) {
      console.error('❌ Dual document upload error:', error);
      return {
        success: false,
        error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Process single document (front or back)
   */
  private async processSingleDocument(
    base64Data: string,
    targetDir: string,
    baseFilename: string
  ): Promise<{ success: boolean; filename?: string; size?: number; error?: string; canBeCombined?: boolean }> {
    try {
      const { mimeType, buffer, fileExtension } = this.parseBase64(base64Data);
      
      console.log(`📄 Processing document: ${baseFilename}${fileExtension} (${mimeType}, ${buffer.length} bytes)`);
      
      const validation = this.validateFile(buffer, mimeType);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const filename = `${baseFilename}${fileExtension}`;
      const filepath = path.join(targetDir, filename);

      await writeFile(filepath, buffer);
      
      // Check if file can be combined (only images and PDFs)
      const canBeCombined = mimeType === 'application/pdf' || mimeType.startsWith('image/');

      console.log(`✅ Document saved: ${filename} (${buffer.length} bytes, can combine: ${canBeCombined})`);

      return {
        success: true,
        filename,
        size: buffer.length,
        canBeCombined
      };

    } catch (error) {
      console.error('❌ Error processing document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create combined PDF from front and back images/PDFs
   */
  private async createCombinedPDF(
    frontPath: string,
    backPath: string,
    targetDir: string,
    filename: string
  ): Promise<{ success: boolean; filename?: string; size?: number; error?: string }> {
    try {
      console.log('📄 Creating combined PDF from front and back documents...');

      const pdfDoc = await PDFDocument.create();
      
      // Read front document
      const frontBuffer = await readFile(frontPath);
      const frontExt = path.extname(frontPath).toLowerCase();

      // Read back document
      const backBuffer = await readFile(backPath);
      const backExt = path.extname(backPath).toLowerCase();

      // Add front pages
      await this.addDocumentToPDF(pdfDoc, frontBuffer, frontExt);
      
      // Add back pages
      await this.addDocumentToPDF(pdfDoc, backBuffer, backExt);

      // Save combined PDF
      const pdfBytes = await pdfDoc.save();
      const combinedPath = path.join(targetDir, filename);
      await writeFile(combinedPath, pdfBytes);

      console.log(`✅ Combined PDF created: ${filename} (${pdfBytes.length} bytes)`);

      return {
        success: true,
        filename,
        size: pdfBytes.length
      };

    } catch (error) {
      console.error('❌ Error creating combined PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Add a document (PDF or image) to an existing PDF
   */
  private async addDocumentToPDF(pdfDoc: PDFDocument, buffer: Buffer, fileExt: string): Promise<void> {
    if (fileExt === '.pdf') {
      const sourcePdf = await PDFDocument.load(buffer);
      const pageCount = sourcePdf.getPageCount();
      const indices = Array.from({ length: pageCount }, (_, i) => i);
      const copiedPages = await pdfDoc.copyPages(sourcePdf, indices);
      for (const page of copiedPages) {
        pdfDoc.addPage(page);
      }
    } else {
      // It's an image
      let image;
      if (fileExt === '.png') {
        image = await pdfDoc.embedPng(buffer);
      } else {
        // JPEG and other formats
        image = await pdfDoc.embedJpg(buffer);
      }
      
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height
      });
    }
  }

  /**
   * Parse base64 data and extract mime type with improved detection
   */
  private parseBase64(base64Data: string): {
    mimeType: string;
    buffer: Buffer;
    fileExtension: string;
  } {
    let mimeType = 'application/octet-stream';
    let base64String = base64Data;
    let fileExtension = '.bin';

    // Parse data URL if present
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64String = matches[2];

        // Map mime type to extension
        const mimeToExt: Record<string, string> = {
          'application/pdf': '.pdf',
          'image/jpeg': '.jpg',
          'image/jpg': '.jpg',
          'image/png': '.png',
          'image/gif': '.gif',
          'image/webp': '.webp',
          'application/msword': '.doc',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
        };
        
        fileExtension = mimeToExt[mimeType] || '.bin';
      }
    }

    const buffer = Buffer.from(base64String, 'base64');

    // If mimeType is still generic, detect from magic bytes
    if (mimeType === 'application/octet-stream' && buffer.length >= 8) {
      // PDF magic bytes: %PDF
      if (buffer.slice(0, 4).toString() === '%PDF') {
        mimeType = 'application/pdf';
        fileExtension = '.pdf';
      }
      // PNG magic bytes
      else if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
        mimeType = 'image/png';
        fileExtension = '.png';
      }
      // JPEG magic bytes
      else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        mimeType = 'image/jpeg';
        fileExtension = '.jpg';
      }
      // DOC magic bytes (OLE2)
      else if (buffer.slice(0, 8).equals(Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]))) {
        mimeType = 'application/msword';
        fileExtension = '.doc';
      }
      // DOCX magic bytes (ZIP format)
      else if (buffer.slice(0, 4).equals(Buffer.from([0x50, 0x4B, 0x03, 0x04]))) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileExtension = '.docx';
      }
      // GIF magic bytes
      else if (buffer.slice(0, 6).toString() === 'GIF89a' || buffer.slice(0, 6).toString() === 'GIF87a') {
        mimeType = 'image/gif';
        fileExtension = '.gif';
      }
    }

    console.log(`📄 Parsed file: ${mimeType}, ${fileExtension}, ${buffer.length} bytes`);
    
    return { mimeType, buffer, fileExtension };
  }

  /**
   * Validate uploaded file
   */
  private validateFile(buffer: Buffer, mimeType: string): {
    valid: boolean;
    error?: string;
  } {
    if (buffer.length > this.maxFileSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`
      };
    }

    if (buffer.length === 0) {
      return { valid: false, error: 'File is empty' };
    }

    if (!this.allowedTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `Invalid file type: ${mimeType}. Allowed types: ${this.allowedTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Initialize upload directories
   */
  async initializeDirectories(): Promise<void> {
    const categories = ['id-documents', 'generated-documents', 'user-files'];
    
    for (const category of categories) {
      const categoryDir = path.join(this.uploadsDir, category);
      await mkdir(categoryDir, { recursive: true });
      console.log(`📁 Initialized: ${categoryDir}`);
    }
  }
}

export const dualDocumentUploadManager = new DualDocumentUploadManager();