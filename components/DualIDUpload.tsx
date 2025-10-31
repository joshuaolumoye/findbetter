"use client";
import React, { useState } from "react";
import { CheckCircle, X, Upload, AlertCircle, FileText, Image as ImageIcon, File } from "lucide-react";

const DualIDUpload = ({ formData, setFormData, setSubmitError }) => {
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [uploadedFrontFile, setUploadedFrontFile] = useState(null);
  const [uploadedBackFile, setUploadedBackFile] = useState(null);

  const handleFileUpload = (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation - increased size limit and more file types
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("Datei ist zu groß. Maximum 10MB erlaubt.");
      return;
    }

    const allowedTypes = [
      "image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp",
      "application/pdf", 
      "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setSubmitError("Nur JPEG, PNG, GIF, PDF oder Word Dateien sind erlaubt.");
      return;
    }

    console.log(`📄 Processing ${side} file:`, {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Convert to base64 for storage
    const reader = new FileReader();
    reader.onload = function (event) {
      const base64Result = event.target?.result;
      
      // Store file info and base64
      const fileData = {
        file: file,
        base64: base64Result,
        name: file.name,
        type: file.type,
        size: file.size
      };
      
      if (side === "front") {
        setFormData((prev) => ({
          ...prev,
          idDocumentFront: file,
          idDocumentFrontBase64: base64Result,
          idDocumentFrontName: file.name,
          idDocumentFrontType: file.type
        }));
        setUploadedFrontFile(fileData);
        
        // Create preview for images only
        if (file.type.startsWith("image/")) {
          setFrontPreview(base64Result);
        } else {
          setFrontPreview(null);
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          idDocumentBack: file,
          idDocumentBackBase64: base64Result,
          idDocumentBackName: file.name,
          idDocumentBackType: file.type
        }));
        setUploadedBackFile(fileData);
        
        // Create preview for images only
        if (file.type.startsWith("image/")) {
          setBackPreview(base64Result);
        } else {
          setBackPreview(null);
        }
      }
      
      console.log(`✅ ${side} document uploaded (${file.name}, ${file.size} bytes, ${file.type})`);
    };
    
    reader.onerror = function (error) {
      console.error('File reading error:', error);
      setSubmitError('Fehler beim Lesen der Datei.');
    };
    
    reader.readAsDataURL(file);
    setSubmitError("");
  };

  const removeFile = (side) => {
    if (side === "front") {
      setUploadedFrontFile(null);
      setFrontPreview(null);
      setFormData((prev) => ({ 
        ...prev, 
        idDocumentFront: null,
        idDocumentFrontBase64: null,
        idDocumentFrontName: null,
        idDocumentFrontType: null
      }));
    } else {
      setUploadedBackFile(null);
      setBackPreview(null);
      setFormData((prev) => ({ 
        ...prev, 
        idDocumentBack: null,
        idDocumentBackBase64: null,
        idDocumentBackName: null,
        idDocumentBackType: null
      }));
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) {
      return <ImageIcon className="w-16 h-16 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-16 h-16 text-red-500" />;
    } else if (fileType?.includes('word') || fileType?.includes('document')) {
      return <File className="w-16 h-16 text-blue-600" />;
    }
    return <File className="w-16 h-16 text-gray-500" />;
  };

  const getFileTypeLabel = (fileType) => {
    if (fileType?.startsWith('image/')) return 'Bild';
    if (fileType === 'application/pdf') return 'PDF Dokument';
    if (fileType?.includes('word') || fileType?.includes('document')) return 'Word Dokument';
    return 'Dokument';
  };

  const renderFilePreview = (fileData, preview, side) => {
    if (!fileData) return null;

    const isImage = fileData.type?.startsWith("image/");

    return (
      <div className="relative h-48 bg-gray-50 rounded-lg border-2 border-green-200 overflow-hidden">
        {/* Show image preview */}
        {isImage && preview && (
          <img 
            src={preview} 
            alt={`${side} preview`}
            className="w-full h-full object-contain"
          />
        )}
        
        {/* Show file icon for non-images */}
        {!isImage && (
          <div className="flex flex-col items-center justify-center h-full p-4">
            {getFileIcon(fileData.type)}
            <p className="text-sm text-gray-700 font-medium mt-2 truncate max-w-[200px]">
              {fileData.name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(fileData.size / 1024).toFixed(1)} KB
            </p>
            <p className="text-xs text-blue-600 mt-1">{getFileTypeLabel(fileData.type)}</p>
          </div>
        )}

        {/* Success badge */}
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs flex items-center shadow-md">
          <CheckCircle className="w-3 h-3 mr-1" />
          Hochgeladen
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={() => removeFile(side)}
          className="absolute top-2 left-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all shadow-md"
        >
          <X className="w-4 h-4" />
        </button>

        {/* File info overlay for images */}
        {isImage && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2">
            <p className="text-xs truncate">{fileData.name}</p>
            <p className="text-xs text-gray-300">{(fileData.size / 1024).toFixed(1)} KB</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="col-span-2 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Dokumente hochladen (Vorder- und Rückseite)
        </label>
        {uploadedFrontFile && uploadedBackFile && (
          <span className="flex items-center text-sm text-green-600 font-medium">
            <CheckCircle className="w-4 h-4 mr-1" />
            Beide Seiten hochgeladen
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Front Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Vorderseite {uploadedFrontFile ? "✓" : "*"}
          </label>
          <div className={`relative rounded-lg transition-all ${
            uploadedFrontFile 
              ? 'border-2 border-green-200' 
              : 'border-2 border-dashed border-gray-300 bg-gray-50'
          }`}>
            {uploadedFrontFile ? (
              renderFilePreview(uploadedFrontFile, frontPreview, "front")
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, "front")}
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center h-48 p-4 hover:bg-gray-100 transition-colors rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Vorderseite hochladen</p>
                  <p className="text-xs text-gray-500 text-center">JPG, PNG, PDF oder Word</p>
                  <p className="text-xs text-gray-500 text-center">(max. 10MB)</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">Klicken zum Auswählen</p>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Back Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Rückseite {uploadedBackFile ? "✓" : "*"}
          </label>
          <div className={`relative rounded-lg transition-all ${
            uploadedBackFile 
              ? 'border-2 border-green-200' 
              : 'border-2 border-dashed border-gray-300 bg-gray-50'
          }`}>
            {uploadedBackFile ? (
              renderFilePreview(uploadedBackFile, backPreview, "back")
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, "back")}
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center h-48 p-4 hover:bg-gray-100 transition-colors rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Rückseite hochladen</p>
                  <p className="text-xs text-gray-500 text-center">JPG, PNG, PDF oder Word</p>
                  <p className="text-xs text-gray-500 text-center">(max. 10MB)</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">Klicken zum Auswählen</p>
                </div>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Info message */}
      <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <p className="font-medium mb-1">Unterstützte Dateiformate:</p>
          <p>• Bilder: JPG, PNG, GIF, WebP</p>
          <p>• Dokumente: PDF, Word (.doc, .docx)</p>
          <p>• Maximale Dateigröße: 10MB pro Datei</p>
        </div>
      </div>
    </div>
  );
};

export default DualIDUpload;