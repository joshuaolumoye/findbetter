'use client';

import { useState } from 'react';
import { XIcon, DownloadIcon, DocumentIcon, ExclamationCircleIcon } from 'lucide-react';

interface UserDocument {
  type: 'pdf' | 'image';
  name: string;
  path: string;
  category: 'application' | 'cancellation' | 'id_front' | 'id_back' | 'id_combined';
  label: string;
  size?: number;
  createdAt?: string;
}

function formatFileSize(bytes?: number) {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function DocumentModal({ 
  document, 
  onClose,
  onDownload 
}: { 
  document: UserDocument; 
  onClose: () => void;
  onDownload: (doc: UserDocument) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Determine document type based on path extension
  const isPDF = document.path.toLowerCase().endsWith('.pdf');
  const isDoc = document.path.toLowerCase().match(/\.(doc|docx)$/);
  const isImage = document.path.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 p-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{document.label || document.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Document Display Area */}
        <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ minHeight: '60vh' }}>
          {isImage && (
            <img
              src={document.path.startsWith('/') ? document.path : `/${document.path}`}
              alt={document.label || document.name}
              className="max-w-full h-auto mx-auto"
              onError={() => setImageError(true)}
              onLoad={() => setImageLoaded(true)}
              style={{ display: imageError ? 'none' : 'block' }}
            />
          )}
          
          {isPDF && (
            <iframe
              src={`${document.path.startsWith('/') ? document.path : `/${document.path}`}#toolbar=0&navpanes=0`}
              className="w-full h-[60vh]"
              title={document.label || document.name}
            />
          )}

          {isDoc && (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
              <DocumentIcon className="h-16 w-16 text-gray-400" />
              <p className="text-gray-600">Word document preview not available</p>
            </div>
          )}

          {imageError && isImage && (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
              <ExclamationCircleIcon className="h-12 w-12 text-red-500" />
              <p className="text-gray-600">Failed to load image</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={() => onDownload(document)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <DownloadIcon className="h-5 w-5 mr-2" />
            Download {isPDF ? 'PDF' : isDoc ? 'Document' : 'Image'}
          </button>
        </div>

        {/* File Info */}
        <div className="mt-4 text-sm text-gray-500">
          <p>Size: {formatFileSize(document.size)}</p>
          <p>Uploaded: {document.createdAt ? new Date(document.createdAt).toLocaleString('de-CH') : 'Unknown'}</p>
        </div>
      </div>
    </div>
  );
}