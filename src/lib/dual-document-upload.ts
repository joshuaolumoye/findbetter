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
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB strict limit
  private allowedTypes: string[] = [
    // Images
    'image/jpeg', 
    'image/png', 
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  }

  /**
   * Save both front and back sides of ID document with strict validation
   */
  async saveDualDocuments(
    frontBase64: string,
    backBase64: string,
    userId: string,
    createCombinedPDF: boolean = true
  ): Promise<DualFileUploadResult> {
    try {
      console.log(`📄 [UPLOAD] Starting dual document upload for user ${userId}`);

      // Early validation of base64 strings
      if (!frontBase64 || !backBase64) {
        return { 
          success: false, 
          error: 'Both front and back documents are required' 
        };
      }

      // Validate base64 format
      if (typeof frontBase64 !== 'string' || typeof backBase64 !== 'string') {
        return {
          success: false,
          error: 'Invalid document format - must be base64 strings'
        };
      }

      // Create user directory
      const userDir = path.join(this.uploadsDir, 'id-documents', userId);
      await mkdir(userDir, { recursive: true });

      const timestamp = Date.now();
      const uniqueId = uuidv4().substring(0, 8);
      
      // Process front side with strict validation
      console.log(`📄 [UPLOAD] Processing front document...`);
      const frontResult = await this.processSingleDocument(
        frontBase64,
        userDir,
        `id_front_${timestamp}_${uniqueId}`
      );

      if (!frontResult.success) {
        console.error(`❌ [UPLOAD] Front upload failed: ${frontResult.error}`);
        return { 
          success: false, 
          error: `Vorderseitendokument fehlgeschlagen: ${frontResult.error}` 
        };
      }

      // Process back side with strict validation
      console.log(`📄 [UPLOAD] Processing back document...`);
      const backResult = await this.processSingleDocument(
        backBase64,
        userDir,
        `id_back_${timestamp}_${uniqueId}`
      );

      if (!backResult.success) {
        console.error(`❌ [UPLOAD] Back upload failed: ${backResult.error}`);
        return { 
          success: false, 
          error: `Rückseitendokument fehlgeschlagen: ${backResult.error}` 
        };
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
          back: frontResult.size
        }
      };

      // Create combined PDF only if both files are images or PDFs
      if (createCombinedPDF && frontResult.canBeCombined && backResult.canBeCombined) {
        console.log(`📄 [UPLOAD] Creating combined PDF...`);
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
          console.log(`✅ [UPLOAD] Combined PDF created successfully`);
        } else {
          console.warn(`⚠️ [UPLOAD] Combined PDF creation failed: ${combinedResult.error}`);
        }
      }

      console.log(`✅ [UPLOAD] Dual documents uploaded successfully for user ${userId}`);
      console.log(`📊 [UPLOAD] Total sizes - Front: ${(result.sizes!.front! / 1024 / 1024).toFixed(2)}MB, Back: ${(result.sizes!.back! / 1024 / 1024).toFixed(2)}MB`);
      
      return result;

    } catch (error) {
      console.error('❌ [UPLOAD] Fatal error in saveDualDocuments:', error);
      return {
        success: false,
        error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Process single document with optimized validation and error handling
   */
  private async processSingleDocument(
    base64Data: string,
    targetDir: string,
    baseFilename: string
  ): Promise<{ 
    success: boolean; 
    filename?: string; 
    size?: number; 
    error?: string; 
    canBeCombined?: boolean 
  }> {
    try {
      // Parse base64 with enhanced error handling
      const parseResult = this.parseBase64Enhanced(base64Data);
      if (!parseResult.success) {
        return { success: false, error: parseResult.error };
      }

      const { mimeType, buffer, fileExtension } = parseResult;
      
      console.log(`📄 [PROCESS] Document parsed: ${baseFilename}${fileExtension} (${mimeType}, ${(buffer!.length / 1024 / 1024).toFixed(2)}MB)`);
      
      // Strict validation
      const validation = this.validateFile(buffer!, mimeType!);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const filename = `${baseFilename}${fileExtension}`;
      const filepath = path.join(targetDir, filename);

      // Write file with error handling
      await writeFile(filepath, buffer!);
      
      // Check if file can be combined (only images and PDFs)
      const canBeCombined = mimeType === 'application/pdf' || mimeType!.startsWith('image/');

      console.log(`✅ [PROCESS] Document saved: ${filename} (${(buffer!.length / 1024 / 1024).toFixed(2)}MB, combinable: ${canBeCombined})`);

      return {
        success: true,
        filename,
        size: buffer!.length,
        canBeCombined
      };

    } catch (error) {
      console.error('❌ [PROCESS] Error processing document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document processing failed'
      };
    }
  }

  /**
   * Enhanced base64 parsing with better error handling and format detection
   */
  private parseBase64Enhanced(base64Data: string): {
    success: boolean;
    mimeType?: string;
    buffer?: Buffer;
    fileExtension?: string;
    error?: string;
  } {
    try {
      if (!base64Data || typeof base64Data !== 'string') {
        return { 
          success: false, 
          error: 'Invalid base64 data - must be a non-empty string' 
        };
      }

      let mimeType = 'application/octet-stream';
      let base64String = base64Data.trim();
      let fileExtension = '.bin';

      // Parse data URL if present
      if (base64String.startsWith('data:')) {
        const dataUrlMatch = base64String.match(/^data:([^;,]+)(;base64)?,(.+)$/);
        if (!dataUrlMatch) {
          return { 
            success: false, 
            error: 'Invalid data URL format' 
          };
        }

        mimeType = dataUrlMatch[1];
        const isBase64 = dataUrlMatch[2] === ';base64';
        base64String = dataUrlMatch[3];

        if (!isBase64) {
          return {
            success: false,
            error: 'Only base64 encoded data URLs are supported'
          };
        }

        // Map mime type to extension
        const mimeToExt: Record<string, string> = {
          // Images
          'image/jpeg': '.jpg',
          'image/jpg': '.jpg',
          'image/png': '.png',
          'image/gif': '.gif',
          'image/webp': '.webp',
          'image/bmp': '.bmp',
          'image/tiff': '.tiff',
          // Documents
          'application/pdf': '.pdf',
          'application/msword': '.doc',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
          'application/vnd.ms-excel': '.xls',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
          'text/plain': '.txt'
        };
        
        fileExtension = mimeToExt[mimeType] || '.bin';
      }

      // Clean base64 string (remove whitespace and newlines)
      base64String = base64String.replace(/\s/g, '');

      // Validate base64 string format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64String)) {
        return {
          success: false,
          error: 'Invalid base64 string format'
        };
      }

      // Decode base64
      let buffer: Buffer;
      try {
        buffer = Buffer.from(base64String, 'base64');
      } catch (decodeError) {
        return { 
          success: false, 
          error: 'Failed to decode base64 data' 
        };
      }

      // STRICT SIZE CHECK
      if (buffer.length > this.maxFileSize) {
        const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
        return {
          success: false,
          error: `File too large (${sizeMB}MB). Maximum: 10MB`
        };
      }

      if (buffer.length === 0) {
        return { success: false, error: 'File is empty' };
      }

      // Detect mime type from magic bytes if still generic or to verify
      if (buffer.length >= 8) {
        const detectedMime = this.detectMimeTypeFromBuffer(buffer);
        if (detectedMime) {
          // Use detected mime type if we couldn't determine it from data URL
          if (mimeType === 'application/octet-stream') {
            mimeType = detectedMime.mimeType;
            fileExtension = detectedMime.extension;
          }
        }
      }

      console.log(`📄 [PARSE] File parsed successfully: ${mimeType}, ${fileExtension}, ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
      
      return { 
        success: true,
        mimeType, 
        buffer, 
        fileExtension 
      };

    } catch (error) {
      console.error('❌ [PARSE] Error parsing base64:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse file data'
      };
    }
  }

  /**
   * Detect MIME type from file magic bytes
   */
  private detectMimeTypeFromBuffer(buffer: Buffer): { mimeType: string; extension: string } | null {
    // PDF
    if (buffer.slice(0, 4).toString() === '%PDF') {
      return { mimeType: 'application/pdf', extension: '.pdf' };
    }
    // PNG
    if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
      return { mimeType: 'image/png', extension: '.png' };
    }
    // JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return { mimeType: 'image/jpeg', extension: '.jpg' };
    }
    // GIF
    if (buffer.slice(0, 6).toString() === 'GIF89a' || buffer.slice(0, 6).toString() === 'GIF87a') {
      return { mimeType: 'image/gif', extension: '.gif' };
    }
    // BMP
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
      return { mimeType: 'image/bmp', extension: '.bmp' };
    }
    // TIFF
    if ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2A && buffer[3] === 0x00) ||
        (buffer[0] === 0x4D && buffer[1] === 0x4D && buffer[2] === 0x00 && buffer[3] === 0x2A)) {
      return { mimeType: 'image/tiff', extension: '.tiff' };
    }
    // DOC (OLE2)
    if (buffer.slice(0, 8).equals(Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]))) {
      return { mimeType: 'application/msword', extension: '.doc' };
    }
    // DOCX/XLSX (ZIP format)
    if (buffer.slice(0, 4).equals(Buffer.from([0x50, 0x4B, 0x03, 0x04]))) {
      // Could be DOCX, XLSX, or other Office format - check for content types
      const bufferStr = buffer.toString('utf8', 0, Math.min(buffer.length, 1000));
      if (bufferStr.includes('word/')) {
        return { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx' };
      } else if (bufferStr.includes('xl/')) {
        return { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: '.xlsx' };
      }
      return { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx' };
    }

    return null;
  }

  /**
   * Validate uploaded file with strict checks
   */
  private validateFile(buffer: Buffer, mimeType: string): {
    valid: boolean;
    error?: string;
  } {
    // CRITICAL: Double-check size
    if (buffer.length > this.maxFileSize) {
      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      const maxSizeMB = (this.maxFileSize / 1024 / 1024).toFixed(0);
      return {
        valid: false,
        error: `File too large (${sizeMB}MB). Maximum: ${maxSizeMB}MB`
      };
    }

    if (buffer.length === 0) {
      return { valid: false, error: 'File is empty' };
    }

    if (!this.allowedTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `Invalid file type: ${mimeType}. Allowed: Images, PDF, Word, Excel, Text`
      };
    }

    return { valid: true };
  }

  /**
   * Create combined PDF from front and back documents (only for images and PDFs)
   */
  private async createCombinedPDF(
    frontPath: string,
    backPath: string,
    targetDir: string,
    filename: string
  ): Promise<{ success: boolean; filename?: string; size?: number; error?: string }> {
    try {
      console.log('📄 [PDF] Creating combined PDF...');

      const pdfDoc = await PDFDocument.create();
      
      // Process front document
      const frontBuffer = await readFile(frontPath);
      const frontExt = path.extname(frontPath).toLowerCase();
      await this.addDocumentToPDF(pdfDoc, frontBuffer, frontExt);
      
      // Process back document
      const backBuffer = await readFile(backPath);
      const backExt = path.extname(backPath).toLowerCase();
      await this.addDocumentToPDF(pdfDoc, backBuffer, backExt);

      // Save combined PDF
      const pdfBytes = await pdfDoc.save();
      const combinedPath = path.join(targetDir, filename);
      await writeFile(combinedPath, pdfBytes);

      console.log(`✅ [PDF] Combined PDF created: ${filename} (${(pdfBytes.length / 1024 / 1024).toFixed(2)}MB)`);

      return {
        success: true,
        filename,
        size: pdfBytes.length
      };

    } catch (error) {
      console.error('❌ [PDF] Error creating combined PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF creation failed'
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
    } else if (['.png', '.webp', '.gif', '.bmp', '.tiff'].includes(fileExt)) {
      const image = await pdfDoc.embedPng(buffer);
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height
      });
    } else {
      // JPEG and others
      const image = await pdfDoc.embedJpg(buffer);
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
   * Initialize upload directories
   */
  async initializeDirectories(): Promise<void> {
    const categories = ['id-documents', 'generated-documents', 'user-files'];
    
    for (const category of categories) {
      const categoryDir = path.join(this.uploadsDir, category);
      await mkdir(categoryDir, { recursive: true });
      console.log(`📁 [INIT] Directory ready: ${categoryDir}`);
    }
  }
}

export const dualDocumentUploadManager = new DualDocumentUploadManager();