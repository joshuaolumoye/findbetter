// lib/file-compression.ts
// Optional utility for compressing images before upload

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  quality: number;
  fileType?: string;
}

export interface CompressionResult {
  success: boolean;
  compressedFile?: File;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
}

/**
 * Compress an image file if it exceeds the size limit
 * This is optional but recommended for better user experience
 */
export async function compressImageIfNeeded(
  file: File,
  options: CompressionOptions = {
    maxSizeMB: 10,
    maxWidthOrHeight: 2048,
    quality: 0.8,
  }
): Promise<CompressionResult> {
  const maxSizeBytes = options.maxSizeMB * 1024 * 1024;
  
  // If file is already under limit, return as-is
  if (file.size <= maxSizeBytes) {
    return {
      success: true,
      compressedFile: file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1,
    };
  }

  // Only compress images
  if (!file.type.startsWith('image/')) {
    if (file.size > maxSizeBytes) {
      return {
        success: false,
        originalSize: file.size,
        error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Please use a file under ${options.maxSizeMB}MB.`,
      };
    }
    return {
      success: true,
      compressedFile: file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1,
    };
  }

  try {
    console.log(`🗜️ Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Create a canvas to resize/compress the image
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Calculate new dimensions while maintaining aspect ratio
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > height) {
      if (width > options.maxWidthOrHeight) {
        height = Math.round((height * options.maxWidthOrHeight) / width);
        width = options.maxWidthOrHeight;
      }
    } else {
      if (height > options.maxWidthOrHeight) {
        width = Math.round((width * options.maxWidthOrHeight) / height);
        height = options.maxWidthOrHeight;
      }
    }

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Draw resized image
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Convert to blob with compression
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        options.fileType || file.type,
        options.quality
      );
    });

    if (!blob) {
      throw new Error('Failed to compress image');
    }

    // Check if compressed size is acceptable
    if (blob.size > maxSizeBytes) {
      // Try again with lower quality
      const lowerQualityBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob),
          options.fileType || file.type,
          options.quality * 0.7 // Reduce quality further
        );
      });

      if (lowerQualityBlob && lowerQualityBlob.size <= maxSizeBytes) {
        const compressedFile = new File([lowerQualityBlob], file.name, {
          type: options.fileType || file.type,
        });

        console.log(`✅ Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(lowerQualityBlob.size / 1024 / 1024).toFixed(2)}MB`);

        return {
          success: true,
          compressedFile,
          originalSize: file.size,
          compressedSize: lowerQualityBlob.size,
          compressionRatio: file.size / lowerQualityBlob.size,
        };
      }

      return {
        success: false,
        originalSize: file.size,
        error: `Could not compress image to under ${options.maxSizeMB}MB. Please use a smaller image.`,
      };
    }

    const compressedFile = new File([blob], file.name, {
      type: options.fileType || file.type,
    });

    console.log(`✅ Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

    return {
      success: true,
      compressedFile,
      originalSize: file.size,
      compressedSize: blob.size,
      compressionRatio: file.size / blob.size,
    };

  } catch (error) {
    console.error('Error compressing image:', error);
    return {
      success: false,
      originalSize: file.size,
      error: error instanceof Error ? error.message : 'Failed to compress image',
    };
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options: {
    maxSizeMB: number;
    allowedTypes: string[];
  }
): { valid: boolean; error?: string } {
  const maxSizeBytes = options.maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large (${formatFileSize(file.size)}). Maximum: ${options.maxSizeMB}MB`,
    };
  }

  if (!options.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}`,
    };
  }

  return { valid: true };
}