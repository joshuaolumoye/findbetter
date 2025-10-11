"use client";
import React, { useEffect, useState } from "react";
import { Camera, CheckCircle, X, AlertCircle, FileText, PenTool } from "lucide-react";
import DualIDUpload from './DualIDUpload'; 

const InsuranceSelectionPopup = ({
  selectedInsurance,
  searchCriteria,
  onClose,
  isOpen
}) => {
  const [formData, setFormData] = useState({
    salutation: 'Herr',
    firstName: '',
    lastName: '',
    birthDate: searchCriteria?.geburtsdatum || '',
    phone: '',
    email: '',
    address: searchCriteria?.fullAddress || '',
    street: '', // City/Street field
    nationality: '',
    ahvNumber: '',
    currentInsurer: selectedInsurance?.insurerName 
      || selectedInsurance?.Insurer 
      || selectedInsurance?.Versicherer 
      || (searchCriteria?.aktuelleKK !== 'Aktuelle KK' ? searchCriteria?.aktuelleKK : ''),
    currentPolicyNumber: '',
    insuranceStartDate: searchCriteria?.newToSwitzerland && searchCriteria?.entryDate 
      ? searchCriteria.entryDate 
      : '2026-01-01',
    idDocumentFront: null,
    idDocumentBack: null,
    idDocumentFrontBase64: null,
    idDocumentBackBase64: null,
    informationArt45: false,
    agbAccepted: false,
    mandateAccepted: false,
    terminationAuthority: false,
    consultationInterest: false
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [currentStep, setCurrentStep] = useState('form');

  useEffect(() => {
    const updates = {};
    
    if (searchCriteria?.newToSwitzerland && searchCriteria?.entryDate) {
      updates.insuranceStartDate = searchCriteria.entryDate;
    } else {
      updates.insuranceStartDate = '2026-01-01';
    }
    
    if (searchCriteria?.fullAddress) {
      updates.address = searchCriteria.fullAddress;
    }
    
    if (selectedInsurance?.insurerName || selectedInsurance?.Insurer) {
      updates.currentInsurer = selectedInsurance.insurerName || selectedInsurance.Insurer;
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
  }, [
    searchCriteria?.newToSwitzerland, 
    searchCriteria?.entryDate, 
    searchCriteria?.fullAddress,
    selectedInsurance?.insurerName,
    selectedInsurance?.Insurer
  ]);

  const validateForm = () => {
    const errors = {};
    const requiredFields = [
      { key: 'firstName', label: 'Vorname' },
      { key: 'lastName', label: 'Nachname' },
      { key: 'birthDate', label: 'Geburtsdatum' },
      { key: 'phone', label: 'Telefonnummer' },
      { key: 'email', label: 'E-Mail' },
      { key: 'address', label: 'Adresse' },
      { key: 'street', label: 'Stadt' }, // NEW: Make street required
      { key: 'currentInsurer', label: 'Aktuelle Krankenversicherung' }
    ];

    if (!searchCriteria?.newToSwitzerland) {
      if (!formData.ahvNumber?.trim()) {
        errors.ahvNumber = 'AHV-Nummer ist erforderlich';
      }
    }

    for (const field of requiredFields) {
      if (!formData[field.key]?.trim()) {
        errors[field.key] = `${field.label} ist erforderlich`;
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }

    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{7,}$/.test(formData.phone)) {
      errors.phone = 'Bitte geben Sie eine gültige Telefonnummer ein';
    }

    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (birthDate > today) {
        errors.birthDate = 'Geburtsdatum kann nicht in der Zukunft liegen';
      } else if (age < 18) {
        errors.birthDate = 'Mindestalter 18 Jahre';
      } else if (age > 120) {
        errors.birthDate = 'Bitte geben Sie ein gültiges Geburtsdatum ein';
      }
    }

    const requiredCheckboxes = [
      { key: 'informationArt45', label: 'Information nach Art. 45' },
      { key: 'agbAccepted', label: 'AGB' },
      { key: 'mandateAccepted', label: 'Auftrag und Vollmacht' },
      { key: 'terminationAuthority', label: 'Vollmacht zur Kündigung' }
    ];

    for (const checkbox of requiredCheckboxes) {
      if (!formData[checkbox.key]) {
        errors[checkbox.key] = `${checkbox.label} muss akzeptiert werden`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { id, value, type } = e.target;
    const checked = e.target.checked;
    
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));

    if (validationErrors[id]) {
      setValidationErrors(prev => ({ ...prev, [id]: '' }));
    }
    
    if (submitError) {
      setSubmitError('');
    }
  };

  const extractPostalCode = (address, fallback) => {
    const match = address.match(/\b\d{4}\b/);
    return match ? match[0] : fallback;
  };

  const extractCity = (address) => {
    const match = address.match(/\b\d{4}\s+(.+)$/);
    return match ? match[1].trim() : '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSubmitError('Bitte korrigieren Sie die Fehler in den markierten Feldern.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setCurrentStep('processing');

    try {
      const postalCode = searchCriteria?.plz || extractPostalCode(formData.address, '8001');
      const city = extractCity(formData.address) || formData.street; // Use street field as city fallback

      console.log('STEP 1: Saving user to database with street field...');

      const userPayload = {
        salutation: formData.salutation,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        birthDate: formData.birthDate,
        address: formData.address.trim(),
        street: formData.street.trim(), // NEW: Include street in payload
        postalCode: postalCode,
        city: city || formData.street.trim(), // Use street as city
        nationality: formData.nationality.trim() || 'swiss',
        ahvNumber: searchCriteria?.newToSwitzerland ? null : (formData.ahvNumber.trim() || null),
        currentInsurancePolicyNumber: formData.currentPolicyNumber.trim() || null,
        insuranceStartDate: formData.insuranceStartDate || '01.01.2026',
        interestedInConsultation: formData.consultationInterest,
        
        searchCriteria: {
          postalCode: searchCriteria?.plz || postalCode,
          birthDate: searchCriteria?.geburtsdatum || formData.birthDate,
          franchise: searchCriteria?.franchise || '300',
          accidentCoverage: searchCriteria?.unfalldeckung || 'Mit Unfalldeckung',
          currentModel: searchCriteria?.aktuellesModell || 'Standard',
          currentInsurer: formData.currentInsurer,
          newToSwitzerland: searchCriteria?.newToSwitzerland || false
        },
        
        selectedInsurance: {
          insurer: selectedInsurance?.Insurer || selectedInsurance?.insurerName || 'Unknown',
          tariffName: selectedInsurance?.['Tariff name'] || selectedInsurance?.tariff || 'Standard',
          premium: parseFloat(String(selectedInsurance?.premium || selectedInsurance?.Praemie || 0)) || 0,
          franchise: String(selectedInsurance?.Franchise || searchCriteria?.franchise || '300'),
          accidentInclusion: selectedInsurance?.['Accident Inclusion'] || searchCriteria?.unfalldeckung || 'Mit Unfalldeckung',
          ageGroup: selectedInsurance?.['Age group'] || 'Adult',
          region: selectedInsurance?.Region || 'CH',
          fiscalYear: String(selectedInsurance?.['Fiscal year'] || '2025')
        },
        
        compliance: {
          informationArt45: formData.informationArt45,
          agbAccepted: formData.agbAccepted,
          mandateAccepted: formData.mandateAccepted,
          terminationAuthority: formData.terminationAuthority,
          consultationInterest: formData.consultationInterest
        }
      };

      console.log('Payload with street field:', {
        address: userPayload.address,
        street: userPayload.street,
        city: userPayload.city
      });

      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userPayload),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.error || 'Failed to save user data');
      }

      const { userId } = await userResponse.json();
      console.log('✅ User saved to database with ID:', userId);

      if (formData.idDocumentFrontBase64 || formData.idDocumentBackBase64) {
        console.log('STEP 2: Uploading ID documents...');
        
        try {
          const uploadResponse = await fetch('/api/upload/dual-documents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              frontImage: formData.idDocumentFrontBase64,
              backImage: formData.idDocumentBackBase64,
              userId: userId.toString()
            })
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            console.log('✅ ID documents uploaded:', uploadResult.files);
          } else {
            console.warn('⚠️ ID document upload failed (non-blocking)');
          }
        } catch (uploadError) {
          console.warn('⚠️ ID document upload error (non-blocking):', uploadError);
        }
      }

      console.log('STEP 3: Processing Skribble documents...');
      
      const skribblePayload = {
        userId: userId,
        userData: userPayload,
        selectedInsurance: userPayload.selectedInsurance,
        searchCriteria: userPayload.searchCriteria,
        compliance: userPayload.compliance
      };

      const skribbleResponse = await fetch('/api/skribble/create-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(skribblePayload),
      });

      if (!skribbleResponse.ok) {
        const errorData = await skribbleResponse.json();
        throw new Error(errorData.error || 'Failed to create documents');
      }

      const result = await skribbleResponse.json();
      console.log('✅ Documents created successfully:', result);

      sessionStorage.setItem('skribble_session', JSON.stringify({
        userId: userId,
        sessionId: result.sessionId,
        documentIds: [result.documentId, result.applicationDocumentId],
        timestamp: Date.now()
      }));

      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.href = '/success';

    } catch (error) {
      console.error('❌ Submission error:', error);
      
      let errorMessage = 'Ein unerwarteter Fehler ist aufgetreten.';
      
      if (error.message.includes('existiert bereits')) {
        errorMessage = 'Ein Benutzer mit dieser E-Mail existiert bereits.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Anfrage-Timeout. Bitte versuchen Sie es erneut.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSubmitError(errorMessage);
      setCurrentStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitSuccess) {
      setFormData({
        salutation: 'Herr',
        firstName: '',
        lastName: '',
        birthDate: searchCriteria?.geburtsdatum || '',
        phone: '',
        email: '',
        address: '',
        street: '',
        nationality: '',
        ahvNumber: '',
        currentInsurer:
          searchCriteria?.aktuelleKK !== 'Aktuelle KK'
            ? searchCriteria?.aktuelleKK
            : '',
        currentPolicyNumber: '',
        insuranceStartDate: '',
        idDocumentFront: null,
        idDocumentBack: null,
        idDocumentFrontBase64: null,
        idDocumentBackBase64: null,
        informationArt45: false,
        agbAccepted: false,
        mandateAccepted: false,
        terminationAuthority: false,
        consultationInterest: false
      });
      setSubmitSuccess(false);
      setValidationErrors({});
      setSubmitError('');
      setCurrentStep('form');
    }
    onClose();
  };

  const swissInsuranceCompanies = [
    "CSS Versicherung AG",
    "Helsana Versicherungen AG", 
    "Swica Krankenversicherung AG",
    "Concordia",
    "Sanitas Krankenversicherung",
    "KPT/CPT",
    "Visana Services AG",
    "Groupe Mutuel",
    "GALENOS Versicherung AG",
    "Assura-Basis AG",
    "Sympany",
    "ÖKK",
    "EGK-Gesundheitskasse",
    "Atupri",
    "Andere"
  ];

  if (!isOpen) return null;

  const isNewToSwitzerland = searchCriteria?.newToSwitzerland === true;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <div className="p-6 sm:p-8">
          <button 
            onClick={handleClose}
            disabled={submitting}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors z-10 disabled:cursor-not-allowed"
          >
            <X className="w-6 h-6" />
          </button>
          
          {currentStep === 'processing' && (
            <div className="text-center py-12">
              <div className="animate-spin w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Benutzer wird registriert...</h3>
              <p className="text-gray-600 mb-2">
                Ihre Daten werden gespeichert und die Dokumente werden vorbereitet...
              </p>
              <p className="text-sm text-blue-600">
                Sie werden automatisch weitergeleitet.
              </p>
            </div>
          )}

          {submitSuccess && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-600 mb-4">Erfolgreich abgeschlossen!</h3>
              <p className="text-gray-600 mb-6">
                Alle Dokumente wurden erfolgreich signiert und versendet.
              </p>
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Schließen
              </button>
            </div>
          )}

          {currentStep === 'form' && (
            <>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 text-center mb-2">
                Persönliche Angaben für Versicherungswechsel
              </h3>
              <p className="text-center text-sm sm:text-base text-gray-600 mb-2">
                Gewählte Versicherung: <span className="font-semibold text-gray-800">{selectedInsurance?.insurerName || selectedInsurance?.Insurer || selectedInsurance?.Versicherer}</span>
              </p>
              <div className="text-center mb-6">
                <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700">
                  <FileText className="w-4 h-4 mr-2" />
                  Echte Skribble-Integration
                </div>
                {isNewToSwitzerland && (
                  <div className="mt-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 inline-flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Neu in der Schweiz - Versicherungsbeginn basiert auf Einreisedatum
                  </div>
                )}
              </div>
              
              {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700 text-sm">{submitError}</span>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col gap-4 lg:gap-6">
                  {/* Salutation */}
                  <div className="w-full lg:w-1/2 lg:pr-4">
                    <label htmlFor="salutation" className="block text-sm font-medium text-gray-700 mb-1">
                      Anrede
                    </label>
                    <select
                      id="salutation"
                      value={formData.salutation}
                      onChange={handleInputChange}
                      className="w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    >
                      <option value="Herr">Herr</option>
                      <option value="Frau">Frau</option>
                    </select>
                  </div>

                  {/* First Name & Last Name */}
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    <div className="w-full lg:w-1/2">
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        Vorname*
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                          validationErrors.firstName ? 'ring-2 ring-red-500 bg-red-50' : 'focus:ring-blue-500'
                        }`}
                        required
                      />
                      {validationErrors.firstName && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
                      )}
                    </div>

                    <div className="w-full lg:w-1/2">
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Nachname*
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={`w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                          validationErrors.lastName ? 'ring-2 ring-red-500 bg-red-50' : 'focus:ring-blue-500'
                        }`}
                        required
                      />
                      {validationErrors.lastName && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Birth Date & Phone */}
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    <div className="w-full lg:w-1/2">
                      <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Geburtsdatum*
                      </label>
                      <input
                        type="date"
                        id="birthDate"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                          validationErrors.birthDate ? 'ring-2 ring-red-500 bg-red-50' : 'focus:ring-blue-500'
                        }`}
                        required
                      />
                      {validationErrors.birthDate && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.birthDate}</p>
                      )}
                    </div>
                    
                    <div className="w-full lg:w-1/2">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Telefonnummer*
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="z.B. +41 79 123 45 67"
                        className={`w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                          validationErrors.phone ? 'ring-2 ring-red-500 bg-red-50' : 'focus:ring-blue-500'
                        }`}
                        required
                      />
                      {validationErrors.phone && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Email & Address */}
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    <div className="w-full lg:w-1/2">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        E-Mail*
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="ihre.email@beispiel.com"
                        className={`w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                          validationErrors.email ? 'ring-2 ring-red-500 bg-red-50' : 'focus:ring-blue-500'
                        }`}
                        required
                      />
                      {validationErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                      )}
                    </div>
                    
                    <div className="w-full lg:w-1/2">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                        PLZ und Ort*
                      </label>
                      <input
                        type="text"
                        id="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Straße Nr, PLZ Ort"
                        disabled={!!searchCriteria?.fullAddress}
                        readOnly={!!searchCriteria?.fullAddress}
                        className={`w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                          validationErrors.address ? 'ring-2 ring-red-500 bg-red-50' : 'focus:ring-blue-500'
                        } ${searchCriteria?.fullAddress ? 'bg-gray-200 cursor-not-allowed' : ''}`}
                        required
                      />
                      {validationErrors.address && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.address}</p>
                      )}
                    </div>
                  </div>

                  {/* Street/City Field - REQUIRED */}
                  <div className="w-full lg:w-1/2">
                    <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                      Strasse*
                    </label>
                    <input
                      type="text"
                      id="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      placeholder="z.B. Musterstrasse 14"
                      className={`w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                        validationErrors.street ? 'ring-2 ring-red-500 bg-red-50' : 'focus:ring-blue-500'
                      }`}
                      required
                    />
                    {validationErrors.street && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.street}</p>
                    )}
                  </div>

                  {/* Current Insurer & Policy Number */}
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    <div className="w-full lg:w-1/2">
                      <label
                        htmlFor="currentInsurer"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Aktuelle Krankenversicherung*
                      </label>
                      <select
                        id="currentInsurer"
                        name="currentInsurer"
                        value={formData.currentInsurer || ""}
                        onChange={handleInputChange}
                        disabled={!!(
                          selectedInsurance?.insurerName ||
                          selectedInsurance?.Insurer ||
                          selectedInsurance?.Versicherer
                        )}
                        readOnly={!!(
                          selectedInsurance?.insurerName ||
                          selectedInsurance?.Insurer ||
                          selectedInsurance?.Versicherer
                        )}
                        className={`w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                          validationErrors.currentInsurer
                            ? 'ring-2 ring-red-500 bg-red-50'
                            : 'focus:ring-blue-500'
                        } ${
                          selectedInsurance?.insurerName ||
                          selectedInsurance?.Insurer ||
                          selectedInsurance?.Versicherer
                            ? 'bg-gray-200 cursor-not-allowed'
                            : ''
                        }`}
                        required
                      >
                        <option value="">Bitte wählen...</option>
                        {swissInsuranceCompanies.map((company: string) => (
                          <option key={company} value={company}>
                            {company}
                          </option>
                        ))}
                      </select>
                      {validationErrors.currentInsurer && (
                        <p className="mt-1 text-sm text-red-600">
                          {validationErrors.currentInsurer}
                        </p>
                      )}
                    </div>
                    
                    <div className="w-full lg:w-1/2">
                      <label htmlFor="currentPolicyNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Aktuelle Policenummer
                      </label>
                      <input 
                        type="text" 
                        id="currentPolicyNumber"
                        value={formData.currentPolicyNumber}
                        onChange={handleInputChange}
                        placeholder="hilft bei der Kündigung"
                        className="w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors" 
                      />
                    </div>
                  </div>

                  {/* ID Document Upload - Full width */}
                  <DualIDUpload 
                    formData={formData}
                    setFormData={setFormData}
                    validationErrors={validationErrors}
                    setValidationErrors={setValidationErrors}
                    setSubmitError={setSubmitError}
                  />

                  {/* AHV Number & Insurance Start Date */}
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    {!isNewToSwitzerland && (
                      <div className="w-full lg:w-1/2">
                        <label htmlFor="ahvNumber" className="block text-sm font-medium text-gray-700 mb-1">
                          AHV-Nummer *
                        </label>
                        <input 
                          type="text" 
                          id="ahvNumber" 
                          value={formData.ahvNumber}
                          onChange={handleInputChange}
                          placeholder="756.XXXX.XXXX.XX"
                          className={`w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                            validationErrors.ahvNumber ? 'ring-2 ring-red-500 bg-red-50' : 'focus:ring-blue-500'
                          }`}
                          required={!isNewToSwitzerland}
                        />
                        {validationErrors.ahvNumber && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.ahvNumber}</p>
                        )}
                      </div>
                    )}

                    <div className={`w-full ${!isNewToSwitzerland ? 'lg:w-1/2' : 'lg:w-1/2'}`}>
                      <label htmlFor="insuranceStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Gewünschter Versicherungsbeginn
                      </label>
                      <input 
                        type="date" 
                        id="insuranceStartDate" 
                        value={formData.insuranceStartDate}
                        onChange={handleInputChange}
                        disabled={true}
                        className="w-full bg-gray-200 border-0 rounded-lg p-3 text-gray-800 cursor-not-allowed focus:outline-none transition-colors"
                      />
                      {isNewToSwitzerland && searchCriteria?.entryDate && (
                        <p className="mt-1 text-xs text-blue-600">
                          ✓ Automatisch gesetzt basierend auf Ihrem Einreisedatum
                        </p>
                      )}
                      {!isNewToSwitzerland && (
                        <p className="mt-1 text-xs text-gray-500">
                          Standard Versicherungsbeginn: 01.01.2026
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Nationality */}
                  <div className="w-full lg:w-1/2 lg:pr-4">
                    <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">
                      Staatsangehörigkeit
                    </label>
                    <input 
                      type="text" 
                      id="nationality" 
                      value={formData.nationality}
                      onChange={handleInputChange}
                      placeholder="z.B. Schweiz, Deutschland"
                      className="w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white placeholder:text-gray-400 transition-colors" 
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-4">Erforderliche Zustimmungen</h4>

                  <div className="flex items-start">
                    <input 
                      id="informationArt45" 
                      type="checkbox" 
                      checked={formData.informationArt45}
                      onChange={handleInputChange}
                      className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1 ${
                        validationErrors.informationArt45 ? 'border-red-500' : ''
                      }`}
                      required
                    />
                    <a 
                      href="/documents/Informationen_nach_Artikel.pdf" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="ml-3 text-sm text-blue-600 font-semibold hover:underline"
                    >
                      Information nach Art. 45*
                    </a>
                  </div>

                  <div className="flex items-start">
                    <input 
                      id="agbAccepted" 
                      type="checkbox" 
                      checked={formData.agbAccepted}
                      onChange={handleInputChange}
                      className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1 ${
                        validationErrors.agbAccepted ? 'border-red-500' : ''
                      }`}
                      required
                    />
                    <a 
                      href="/documents/Allgemeine_geschaftsbedingungen.pdf" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="ml-3 text-sm text-blue-600 font-semibold hover:underline"
                    >
                      AGB*
                    </a>
                  </div>

                  <div className="flex items-start">
                    <input 
                      id="mandateAccepted" 
                      type="checkbox" 
                      checked={formData.mandateAccepted}
                      onChange={handleInputChange}
                      className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1 ${
                        validationErrors.mandateAccepted ? 'border-red-500' : ''
                      }`}
                      required
                    />
                    <a 
                      href="/documents/Muster_Brokermandat_DE_Vollmandat.pdf" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="ml-3 text-sm text-blue-600 font-semibold hover:underline"
                    >
                      Auftrag und Vollmacht*
                    </a>
                  </div>

                  <div className="flex items-start">
                    <input 
                      id="terminationAuthority" 
                      type="checkbox" 
                      checked={formData.terminationAuthority}
                      onChange={handleInputChange}
                      className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1 ${
                        validationErrors.terminationAuthority ? 'border-red-500' : ''
                      }`}
                      required
                    />
                    <a 
                      href="/documents/Vollmacht_zur_Kundigung.pdf" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="ml-3 text-sm text-blue-600 font-semibold hover:underline"
                    >
                      Vollmacht zur Kündigung*
                    </a>
                  </div>

                  <div className="flex items-start">
                    <input 
                      id="consultationInterest" 
                      type="checkbox" 
                      checked={formData.consultationInterest}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-blue-500 mt-1" 
                    />
                    <span className="ml-3 text-sm text-gray-600 font-medium">
                      Interesse an einer Beratung
                    </span>
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="pt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-8 py-3 rounded-lg font-semibold transition duration-200 text-base focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center ${
                      submitting 
                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Registrierung läuft...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5 mr-2" />
                        Registrieren & Dokumente signieren
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsuranceSelectionPopup;