"use client";
import { useState } from 'react';

interface Document {
  type: 'pdf' | 'image';
  name: string;
  path: string;
  category: 'application' | 'cancellation' | 'id_front' | 'id_back' | 'id_combined';
  label: string;
}

interface DocumentViewerProps {
  documents: Document[];
  onClose?: () => void;
}

export default function DocumentViewer({ documents, onClose }: DocumentViewerProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async (document: Document) => {
    try {
      setDownloading(true);
      setError('');
      
      const response = await fetch(document.path);
      if (!response.ok) throw new Error('Failed to fetch document');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No documents available
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
        <div className="space-y-3">
          {documents.map((doc, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">{doc.label || doc.name}</p>
                  <p className="text-sm text-gray-500">
                    {doc.category === 'application'
                      ? 'Insurance Application'
                      : doc.category === 'cancellation'
                      ? 'Insurance Cancellation'
                      : 'ID Document'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => handleDownload(doc)}
                disabled={downloading}
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {downloading ? 'Downloading...' : 'Download'}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}