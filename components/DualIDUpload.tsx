"use client";
import React, { useState } from "react";
import { CheckCircle, X, Upload, AlertCircle, FileText } from "lucide-react";

const DualIDUpload = ({ formData, setFormData, setSubmitError }) => {
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [uploadedFrontFile, setUploadedFrontFile] = useState(null);
  const [uploadedBackFile, setUploadedBackFile] = useState(null);

  const handleFileUpload = (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Datei ist zu groß. Maximum 5MB erlaubt.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setSubmitError("Nur JPEG, PNG oder PDF Dateien sind erlaubt.");
      return;
    }

    // Convert to base64 for storage
    const reader = new FileReader();
    reader.onload = function (event) {
      const base64Result = event.target?.result;
      
      // Store base64 in formData for upload
      if (side === "front") {
        setFormData((prev) => ({
          ...prev,
          idDocumentFront: file,
          idDocumentFrontBase64: base64Result
        }));
        setUploadedFrontFile(file);
        
        // Create preview for images
        if (file.type.startsWith("image/")) {
          setFrontPreview(base64Result);
        } else {
          setFrontPreview(null);
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          idDocumentBack: file,
          idDocumentBackBase64: base64Result
        }));
        setUploadedBackFile(file);
        
        // Create preview for images
        if (file.type.startsWith("image/")) {
          setBackPreview(base64Result);
        } else {
          setBackPreview(null);
        }
      }
      
      console.log(`✅ ${side} document converted to base64 (${file.size} bytes)`);
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
        idDocumentFrontBase64: null 
      }));
    } else {
      setUploadedBackFile(null);
      setBackPreview(null);
      setFormData((prev) => ({ 
        ...prev, 
        idDocumentBack: null,
        idDocumentBackBase64: null 
      }));
    }
  };

  const renderFilePreview = (file, preview, side) => {
    if (!file) return null;

    // Show image preview
    if (file.type.startsWith("image/") && preview) {
      return (
        <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
          <img 
            src={preview} 
            alt={`${side} preview`}
            className="w-full h-full object-contain"
          />
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
          {/* File info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2">
            <p className="text-xs truncate">{file.name}</p>
            <p className="text-xs text-gray-300">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
      );
    }

    // Show PDF preview
    if (file.type === "application/pdf") {
      return (
        <div className="relative h-48 bg-gray-50 rounded-lg border-2 border-gray-200 flex items-center justify-center">
          <div className="text-center p-4">
            <FileText className="w-16 h-16 text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-700 font-medium mb-1 truncate max-w-[200px]">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            <div className="mt-2 flex items-center justify-center text-green-600 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              PDF hochgeladen
            </div>
          </div>
          {/* Remove button */}
          <button
            type="button"
            onClick={() => removeFile(side)}
            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all shadow-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="col-span-2 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Ausweis Kopie (Vorder- und Rückseite)
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
                  accept="image/*,.pdf"
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center h-48 p-4 hover:bg-gray-100 transition-colors rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Vorderseite hochladen</p>
                  <p className="text-xs text-gray-500 text-center">JPG, PNG oder PDF (max. 5MB)</p>
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
                  accept="image/*,.pdf"
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center h-48 p-4 hover:bg-gray-100 transition-colors rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Rückseite hochladen</p>
                  <p className="text-xs text-gray-500 text-center">JPG, PNG oder PDF (max. 5MB)</p>
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
        <p className="text-xs text-blue-700">
          Bitte laden Sie beide Seiten Ihres Ausweises hoch. Die Dokumente werden sicher verschlüsselt und nur für die Verifizierung verwendet.
        </p>
      </div>
    </div>
  );
};

export default DualIDUpload;