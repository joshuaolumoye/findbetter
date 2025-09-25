// lib/file-upload.ts
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadResult {
  success: boolean;
  path?: string;
  error?: string;
  filename?: string;
  size?: number;
}

export class FileUploadManager {
  private uploadsDir: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private allowedTypes: string[] = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  }

  /**
   * Save a base64 encoded file to the uploads directory
   */
  async saveBase64File(
    base64Data: string,
    userId: string,
    category: 'id-documents' | 'generated-documents' | 'user-files' = 'user-files',
    originalFilename?: string
  ): Promise<FileUploadResult> {
    try {
      console.log(`Starting file upload for user ${userId}, category: ${category}`);

      // Validate and parse base64 data
      const { mimeType, buffer, fileExtension } = this.parseBase64(base64Data);
      
      // Validate file
      const validation = this.validateFile(buffer, mimeType);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Create directory structure
      const userDir = path.join(this.uploadsDir, category, userId);
      await mkdir(userDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const uniqueId = uuidv4().substring(0, 8);
      const sanitizedOriginal = originalFilename ? 
        this.sanitizeFilename(originalFilename) : 
        `document_${timestamp}`;
      
      const filename = `${sanitizedOriginal}_${uniqueId}${fileExtension}`;
      const filePath = path.join(userDir, filename);

      // Save file
      await writeFile(filePath, buffer);

      // Return relative path for database storage
      const relativePath = `/uploads/${category}/${userId}/${filename}`;

      console.log(`File uploaded successfully: ${filename} (${buffer.length} bytes)`);

      return {
        success: true,
        path: relativePath,
        filename: filename,
        size: buffer.length
      };

    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: `Upload failed: ${error.message}`
      };
    }
  }

  /**
   * Save a Buffer to the uploads directory
   */
  async saveBuffer(
    buffer: Buffer,
    userId: string,
    filename: string,
    category: 'id-documents' | 'generated-documents' | 'user-files' = 'generated-documents'
  ): Promise<FileUploadResult> {
    try {
      // Create directory structure
      const userDir = path.join(this.uploadsDir, category, userId);
      await mkdir(userDir, { recursive: true });

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = path.extname(filename) || '.pdf';
      const baseName = path.basename(filename, fileExtension);
      const uniqueFilename = `${baseName}_${timestamp}${fileExtension}`;
      
      const filePath = path.join(userDir, uniqueFilename);

      // Save file
      await writeFile(filePath, buffer);

      // Return relative path
      const relativePath = `/uploads/${category}/${userId}/${uniqueFilename}`;

      console.log(`Buffer saved successfully: ${uniqueFilename} (${buffer.length} bytes)`);

      return {
        success: true,
        path: relativePath,
        filename: uniqueFilename,
        size: buffer.length
      };

    } catch (error) {
      console.error('Buffer save error:', error);
      return {
        success: false,
        error: `Save failed: ${error.message}`
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

    // Check if it's a data URL
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64String = matches[2];
        
        // Determine file extension from MIME type
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
          default:
            fileExtension = '.bin';
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
    // Check file size
    if (buffer.length > this.maxFileSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`
      };
    }

    // Check empty file
    if (buffer.length === 0) {
      return {
        valid: false,
        error: 'File is empty'
      };
    }

    // Check MIME type
    if (!this.allowedTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Sanitize filename to prevent path traversal
   */
  private sanitizeFilename(filename: string): string {
    // Remove path separators and dangerous characters
    return filename
      .replace(/[\/\\:*?"<>|]/g, '_')
      .replace(/\.+/g, '.')
      .replace(/^\./, '')
      .substring(0, 100); // Limit length
  }

  /**
   * Initialize upload directories
   */
  async initializeDirectories(): Promise<void> {
    const categories = ['id-documents', 'generated-documents', 'user-files'];
    
    for (const category of categories) {
      const categoryDir = path.join(this.uploadsDir, category);
      await mkdir(categoryDir, { recursive: true });
      console.log(`Initialized upload directory: ${categoryDir}`);
    }
  }

  /**
   * Get file info without reading the full file
   */
  async getFileInfo(relativePath: string): Promise<{
    exists: boolean;
    size?: number;
    mtime?: Date;
  }> {
    try {
      const { stat } = await import('fs/promises');
      const fullPath = path.join(process.cwd(), 'public', relativePath);
      const stats = await stat(fullPath);
      
      return {
        exists: true,
        size: stats.size,
        mtime: stats.mtime
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Clean up old files (call periodically)
   */
  async cleanupOldFiles(maxAgeHours: number = 72): Promise<number> {
    try {
      const { readdir, stat, unlink } = await import('fs/promises');
      let deletedCount = 0;
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
      const now = Date.now();

      const categories = ['id-documents', 'generated-documents', 'user-files'];
      
      for (const category of categories) {
        const categoryDir = path.join(this.uploadsDir, category);
        
        try {
          const userDirs = await readdir(categoryDir);
          
          for (const userDir of userDirs) {
            const userDirPath = path.join(categoryDir, userDir);
            const files = await readdir(userDirPath);
            
            for (const file of files) {
              const filePath = path.join(userDirPath, file);
              const stats = await stat(filePath);
              
              if (now - stats.mtime.getTime() > maxAge) {
                await unlink(filePath);
                deletedCount++;
                console.log(`Deleted old file: ${filePath}`);
              }
            }
          }
        } catch (error) {
          console.warn(`Error cleaning category ${category}:`, error.message);
        }
      }

      console.log(`Cleanup completed: ${deletedCount} files deleted`);
      return deletedCount;
      
    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const fileUploadManager = new FileUploadManager();