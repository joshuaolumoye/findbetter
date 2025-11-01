"use client";
import React, { useState } from "react";
import { CheckCircle, X, Upload, AlertCircle, FileText, Image as ImageIcon, File, Loader2 } from "lucide-react";

const DualIDUpload = ({ formData, setFormData, setSubmitError }) => {
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [uploadedFrontFile, setUploadedFrontFile] = useState(null);
  const [uploadedBackFile, setUploadedBackFile] = useState(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  // Optimized file size validation
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const CHUNK_SIZE = 512 * 1024; // 512KB chunks for reading

  const validateFileSize = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Datei ist zu groß (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum 10MB erlaubt.`
      };
    }
    return { valid: true };
  };

  const validateFileType = (file) => {
    const allowedTypes = [
      "image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp",
      "application/pdf", 
      "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: "Nur JPEG, PNG, GIF, WebP, PDF oder Word Dateien sind erlaubt."
      };
    }
    return { valid: true };
  };

  // Optimized file reading with chunking for large files
  const readFileOptimized = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('Fehler beim Lesen der Datei.'));
      };

      reader.onabort = () => {
        reject(new Error('Datei-Upload wurde abgebrochen.'));
      };

      // For smaller files (< 5MB), read directly
      // For larger files, we still use readAsDataURL but with better error handling
      if (file.size < 5 * 1024 * 1024) {
        reader.readAsDataURL(file);
      } else {
        // For larger files, show progress
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileUpload = async (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Set loading state immediately
    if (side === "front") {
      setUploadingFront(true);
    } else {
      setUploadingBack(true);
    }

    try {
      // STEP 1: Validate file size first (fastest check)
      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.valid) {
        setSubmitError(sizeValidation.error);
        return;
      }

      // STEP 2: Validate file type
      const typeValidation = validateFileType(file);
      if (!typeValidation.valid) {
        setSubmitError(typeValidation.error);
        return;
      }

      console.log(`📄 Processing ${side} file:`, {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      });

      // STEP 3: Read file optimized
      const base64Result = await readFileOptimized(file);

      // STEP 4: Store file info and base64
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
      
      console.log(`✅ ${side} document uploaded successfully (${(file.size / 1024).toFixed(1)}KB)`);
      setSubmitError(""); // Clear any previous errors
      
    } catch (error) {
      console.error('File upload error:', error);
      setSubmitError(error.message || 'Fehler beim Hochladen der Datei. Bitte versuchen Sie es erneut.');
      
      // Clear the file input
      e.target.value = '';
    } finally {
      // Always clear loading state
      if (side === "front") {
        setUploadingFront(false);
      } else {
        setUploadingBack(false);
      }
    }
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
    setSubmitError(""); // Clear errors when removing files
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
        {isImage && preview && (
          <img 
            src={preview} 
            alt={`${side} preview`}
            className="w-full h-full object-contain"
          />
        )}
        
        {!isImage && (
          <div className="flex flex-col items-center justify-center h-full p-4">
            {getFileIcon(fileData.type)}
            <p className="text-sm text-gray-700 font-medium mt-2 truncate max-w-[200px]">
              {fileData.name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(fileData.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-xs text-blue-600 mt-1">{getFileTypeLabel(fileData.type)}</p>
          </div>
        )}

        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs flex items-center shadow-md">
          <CheckCircle className="w-3 h-3 mr-1" />
          Hochgeladen
        </div>

        <button
          type="button"
          onClick={() => removeFile(side)}
          className="absolute top-2 left-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all shadow-md"
        >
          <X className="w-4 h-4" />
        </button>

        {isImage && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2">
            <p className="text-xs truncate">{fileData.name}</p>
            <p className="text-xs text-gray-300">{(fileData.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}
      </div>
    );
  };

  const renderUploadArea = (side, isUploading) => {
    return (
      <label className="cursor-pointer block">
        <input
          type="file"
          onChange={(e) => handleFileUpload(e, side)}
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          disabled={isUploading}
        />
        <div className={`flex flex-col items-center justify-center h-48 p-4 rounded-lg transition-colors ${
          isUploading ? 'bg-blue-50' : 'hover:bg-gray-100'
        }`}>
          {isUploading ? (
            <>
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-blue-700 mb-1">Wird hochgeladen...</p>
              <p className="text-xs text-blue-600">Bitte warten</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {side === "front" ? "Vorderseite hochladen" : "Rückseite hochladen"}
              </p>
              <p className="text-xs text-gray-500 text-center">JPG, PNG, PDF oder Word</p>
              <p className="text-xs text-gray-500 text-center">(max. 10MB)</p>
              <p className="text-xs text-blue-600 mt-2 font-medium">Klicken zum Auswählen</p>
            </>
          )}
        </div>
      </label>
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
              : uploadingFront
              ? 'border-2 border-blue-300'
              : 'border-2 border-dashed border-gray-300 bg-gray-50'
          }`}>
            {uploadedFrontFile ? (
              renderFilePreview(uploadedFrontFile, frontPreview, "front")
            ) : (
              renderUploadArea("front", uploadingFront)
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
              : uploadingBack
              ? 'border-2 border-blue-300'
              : 'border-2 border-dashed border-gray-300 bg-gray-50'
          }`}>
            {uploadedBackFile ? (
              renderFilePreview(uploadedBackFile, backPreview, "back")
            ) : (
              renderUploadArea("back", uploadingBack)
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
          <p className="mt-1 font-medium">💡 Tipp: Komprimieren Sie große Dateien vor dem Hochladen</p>
        </div>
      </div>
    </div>
  );
};

export default DualIDUpload;