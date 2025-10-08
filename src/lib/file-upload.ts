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
  private allowedTypes: string[] = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

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

      // Create combined PDF if requested
      if (createCombinedPDF) {
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
        error: `Upload failed: ${error.message}`
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
  ): Promise<{ success: boolean; filename?: string; size?: number; error?: string }> {
    try {
      const { mimeType, buffer, fileExtension } = this.parseBase64(base64Data);
      
      const validation = this.validateFile(buffer, mimeType);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const filename = `${baseFilename}${fileExtension}`;
      const filepath = path.join(targetDir, filename);

      await writeFile(filepath, buffer);

      return {
        success: true,
        filename,
        size: buffer.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
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

      // Add front page
      if (frontExt === '.pdf') {
        const frontPdf = await PDFDocument.load(frontBuffer);
        const [frontPage] = await pdfDoc.copyPages(frontPdf, [0]);
        pdfDoc.addPage(frontPage);
      } else {
        // It's an image
        const frontImage = frontExt === '.png' 
          ? await pdfDoc.embedPng(frontBuffer)
          : await pdfDoc.embedJpg(frontBuffer);
        
        const page = pdfDoc.addPage([frontImage.width, frontImage.height]);
        page.drawImage(frontImage, {
          x: 0,
          y: 0,
          width: frontImage.width,
          height: frontImage.height
        });
      }

      // Add back page
      if (backExt === '.pdf') {
        const backPdf = await PDFDocument.load(backBuffer);
        const [backPage] = await pdfDoc.copyPages(backPdf, [0]);
        pdfDoc.addPage(backPage);
      } else {
        // It's an image
        const backImage = backExt === '.png'
          ? await pdfDoc.embedPng(backBuffer)
          : await pdfDoc.embedJpg(backBuffer);
        
        const page = pdfDoc.addPage([backImage.width, backImage.height]);
        page.drawImage(backImage, {
          x: 0,
          y: 0,
          width: backImage.width,
          height: backImage.height
        });
      }

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
        error: error.message
      };
    }
  }

  /**
   * Parse base64 data and extract mime type
   */
  private parseBase64(base64Data: string): {
    mimeType: string;
    buffer: Buffer;
    fileExtension: string;
  } {
    let mimeType = 'application/octet-stream';
    let base64String = base64Data;
    let fileExtension = '.bin';

    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64String = matches[2];
        
        switch (mimeType) {
          case 'application/pdf':
            fileExtension = '.pdf';
            break;
          case 'image/jpeg':
          case 'image/jpg':
            fileExtension = '.jpg';
            break;
          case 'image/png':
            fileExtension = '.png';
            break;
        }
      }
    }

    const buffer = Buffer.from(base64String, 'base64');
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
        error: `Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`
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