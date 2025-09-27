"use client";
import React, { useState } from "react";
import { Camera, CheckCircle, X, AlertCircle, FileText, PenTool } from "lucide-react";

interface InsuranceSelectionPopupProps {
  selectedInsurance: any;
  searchCriteria: any;
  onClose: () => void;
  isOpen: boolean;
}

const InsuranceSelectionPopup: React.FC<InsuranceSelectionPopupProps> = ({
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
    address: '',
    nationality: '',
    ahvNumber: '',
    currentInsurer: searchCriteria?.aktuelleKK !== 'Aktuelle KK' ? searchCriteria?.aktuelleKK : '',
    currentPolicyNumber: '',
    insuranceStartDate: '',
    informationArt45: false,
    agbAccepted: false,
    mandateAccepted: false,
    terminationAuthority: false,
    consultationInterest: false
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [currentStep, setCurrentStep] = useState<'form' | 'processing' | 'redirect'>('form');

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    const requiredFields = [
      { key: 'firstName', label: 'Vorname' },
      { key: 'lastName', label: 'Nachname' },
      { key: 'birthDate', label: 'Geburtsdatum' },
      { key: 'phone', label: 'Telefonnummer' },
      { key: 'email', label: 'E-Mail' },
      { key: 'address', label: 'Adresse' },
      { key: 'currentInsurer', label: 'Aktuelle Krankenversicherung' }
    ];

    // Check required fields
    for (const field of requiredFields) {
      if (!formData[field.key]?.trim()) {
        errors[field.key] = `${field.label} ist erforderlich`;
      }
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }

    // Phone validation
    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{7,}$/.test(formData.phone)) {
      errors.phone = 'Bitte geben Sie eine gültige Telefonnummer ein';
    }

    // Birth date validation
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

    // Required checkboxes
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));

    // Clear validation error when user starts typing
    if (validationErrors[id]) {
      setValidationErrors(prev => ({ ...prev, [id]: '' }));
    }
    
    if (submitError) {
      setSubmitError('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Datei ist zu groß. Maximum 5MB erlaubt.');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setSubmitError('Nur JPEG, PNG oder PDF Dateien sind erlaubt.');
      return;
    }

    setUploadedFile(file);
    setSubmitError('');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const extractPostalCode = (address: string, fallback: string): string => {
    const match = address.match(/\b\d{4}\b/);
    return match ? match[0] : fallback;
  };

  const extractCity = (address: string): string => {
    const match = address.match(/\b\d{4}\s+(.+)$/);
    return match ? match[1].trim() : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSubmitError('Bitte korrigieren Sie die Fehler in den markierten Feldern.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setCurrentStep('processing');

    try {
      // Get postal code from search criteria or extract from address
      const postalCode = searchCriteria?.plz || extractPostalCode(formData.address, '8001');
      const city = extractCity(formData.address);

      console.log('PRODUCTION: Starting user registration and document creation...');

      // Convert file to base64 if uploaded
      let idDocumentBase64 = null;
      if (uploadedFile) {
        try {
          idDocumentBase64 = await fileToBase64(uploadedFile);
        } catch (fileError) {
          console.warn('File conversion failed:', fileError);
        }
      }

      // Structure the request body correctly for the API validation
      const requestBody = {
        userData: {
          salutation: formData.salutation,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          birthDate: formData.birthDate,
          address: formData.address.trim(),
          postalCode: postalCode,
          city: city || '',
          nationality: formData.nationality.trim() || 'swiss',
          ahvNumber: formData.ahvNumber.trim() || null,
          currentInsurer: formData.currentInsurer,
          currentInsurancePolicyNumber: formData.currentPolicyNumber.trim() || null,
          insuranceStartDate: formData.insuranceStartDate || '01.01.2025',
          interestedInConsultation: formData.consultationInterest
        },

        selectedInsurance: {
          insurer: selectedInsurance?.Insurer || selectedInsurance?.Versicherer || 'Unknown',
          tariffName: selectedInsurance?.['Tariff name'] || selectedInsurance?.Modell || 'Standard',
          premium: parseFloat(String(selectedInsurance?.Bonus || selectedInsurance?.Praemie || 0)) || 0,
          franchise: String(selectedInsurance?.Franchise || searchCriteria?.franchise || '300'),
          accidentInclusion: selectedInsurance?.['Accident Inclusion'] || selectedInsurance?.Unfalldeckung || searchCriteria?.unfalldeckung || 'Mit Unfalldeckung',
          ageGroup: selectedInsurance?.['Age group'] || selectedInsurance?.AgeRange || 'Adult',
          region: selectedInsurance?.Region || selectedInsurance?.Kanton || 'CH',
          fiscalYear: String(selectedInsurance?.['Fiscal year'] || selectedInsurance?.Jahr || '2025')
        },

        searchCriteria: {
          postalCode: searchCriteria?.plz || postalCode,
          birthDate: searchCriteria?.geburtsdatum || formData.birthDate,
          franchise: searchCriteria?.franchise || '300',
          accidentCoverage: searchCriteria?.unfalldeckung || 'Mit Unfalldeckung',
          currentModel: searchCriteria?.aktuellesModell || 'Standard',
          currentInsurer: formData.currentInsurer || searchCriteria?.aktuelleKK,
          newToSwitzerland: searchCriteria?.newToSwitzerland || false
        },

        compliance: {
          informationArt45: formData.informationArt45,
          agbAccepted: formData.agbAccepted,
          mandateAccepted: formData.mandateAccepted,
          terminationAuthority: formData.terminationAuthority,
          consultationInterest: formData.consultationInterest
        },

        idDocument: idDocumentBase64
      };

      console.log('PRODUCTION: Submitting with correct structure...', {
        hasUserData: !!requestBody.userData,
        hasCurrentInsurer: !!requestBody.userData.currentInsurer,
        currentInsurer: requestBody.userData.currentInsurer,
        hasSelectedInsurance: !!requestBody.selectedInsurance,
        selectedInsurer: requestBody.selectedInsurance.insurer
      });

      // Create user and documents in one call
      const response = await fetch('/api/skribble/create-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60000)
      });

      let result;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const textResult = await response.text();
        console.error('Non-JSON response from Skribble API:', textResult);
        throw new Error('Server returned invalid response format');
      }

      if (!response.ok) {
        console.error('Skribble API Error Response:', result);
        throw new Error(result?.error || result?.message || `Server error: ${response.status}`);
      }

      console.log('PRODUCTION: Documents created successfully:', result);

      // Check if we have success response (no signingUrl means redirect to success page)
      if (result.success && !result.signingUrl) {
        // Store session info for success page
        sessionStorage.setItem('skribble_session', JSON.stringify({
          sessionId: result.sessionId,
          documentIds: [result.cancellationDocumentId, result.applicationDocumentId],
          currentInsurer: result.currentInsurer,
          selectedInsurer: result.selectedInsurer,
          userEmail: result.userEmail,
          timestamp: Date.now()
        }));

        console.log('PRODUCTION: Redirecting to success page...');
        
        // Small delay to ensure user sees the processing message
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Redirect to success page
        window.location.href = '/success';
        return;
      }

      // Original Skribble redirect logic (if signingUrl is provided)
      if (result.signingUrl) {
        // Store signing session info for tracking
        sessionStorage.setItem('skribble_session', JSON.stringify({
          userId: result.userId,
          sessionId: result.sessionId,
          documentIds: [result.documentId, result.applicationDocumentId],
          timestamp: Date.now(),
          environment: result.compliance?.environment || 'production'
        }));

        console.log('PRODUCTION: Redirecting to Skribble signing URL:', result.signingUrl);

        // Small delay to ensure user sees the redirect message
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Redirect to Skribble
        window.location.href = result.signingUrl;
        return;
      }else {
          // If neither success nor signingUrl, throw error
          throw new Error('No valid response received from service');
      }

    } catch (error: any) {
      console.error('PRODUCTION: Submission error:', error);
      
      let errorMessage = 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Anfrage-Timeout. Bitte versuchen Sie es erneut.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Anfrage-Timeout. Bitte versuchen Sie es erneut.';
      } else if (error.message.includes('existiert bereits') || error.message.includes('USER_EXISTS')) {
        errorMessage = 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.';
      } else if (error.message.includes('validation') || error.message.includes('VALIDATION_ERROR')) {
        errorMessage = 'Pflichtfelder fehlen oder sind ungültig. Bitte überprüfen Sie Ihre Eingaben.';
      } else if (error.message.includes('SKRIBBLE_ERROR')) {
        errorMessage = 'Der Signaturdienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.';
      } else if (error.message.includes('DATABASE_ERROR')) {
        errorMessage = 'Datenbankverbindungsfehler. Bitte versuchen Sie es erneut.';
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
        nationality: '',
        ahvNumber: '',
        currentInsurer: searchCriteria?.aktuelleKK !== 'Aktuelle KK' ? searchCriteria?.aktuelleKK : '',
        currentPolicyNumber: '',
        insuranceStartDate: '',
        informationArt45: false,
        agbAccepted: false,
        mandateAccepted: false,
        terminationAuthority: false,
        consultationInterest: false
      });
      setUploadedFile(null);
      setSubmitSuccess(false);
      setValidationErrors({});
      setSubmitError('');
      setCurrentStep('form');
    }
    onClose();
  };

  // Swiss insurance companies for dropdown
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <div className="p-8">
          <button 
            onClick={handleClose}
            disabled={submitting}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors z-10 disabled:cursor-not-allowed"
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
                Sie werden automatisch zu Skribble weitergeleitet.
              </p>
            </div>
          )}

          {currentStep === 'redirect' && (
            <div className="text-center py-12">
              <PenTool className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-blue-600 mb-4">Weiterleitung zu Skribble</h3>
              <p className="text-gray-600 mb-6">
                Ihre Registrierung war erfolgreich! Sie werden automatisch zu Skribble weitergeleitet, 
                wo Sie die Kündigung und den neuen Versicherungsantrag digital signieren können.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h4 className="font-semibold text-blue-800 mb-2">Was passiert als nächstes:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>1. Kündigungsformular für {formData.currentInsurer} signieren</li>
                  <li>2. Antrag für {selectedInsurance?.Insurer || selectedInsurance?.Versicherer} signieren</li>
                  <li>3. Beide Dokumente werden automatisch versendet</li>
                </ul>
              </div>
            </div>
          )}

          {submitSuccess && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-600 mb-4">Erfolgreich abgeschlossen!</h3>
              <p className="text-gray-600 mb-6">
                Alle Dokumente wurden erfolgreich signiert und versendet. 
                Wir werden uns in Kürze bei Ihnen melden.
              </p>
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Schließen
              </button>
            </div>
          )}

          {currentStep === 'form' && (
            <>
              <h3 className="text-2xl font-bold text-gray-800 text-center mb-2">
                Persönliche Angaben für Versicherungswechsel
              </h3>
              <p className="text-center text-gray-600 mb-2">
                {selectedInsurance?.Insurer || selectedInsurance?.Versicherer} - {selectedInsurance?.['Tariff name'] || selectedInsurance?.Modell}
              </p>
              <div className="text-center mb-6">
                <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700">
                  <FileText className="w-4 h-4 mr-2" />
                   Echte Skribble-Integration
                </div>
                {searchCriteria?.plz && (
                  <div className="mt-2 text-sm text-green-600">
                    ✓ PLZ {searchCriteria.plz} aus Ihrer Suche
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Salutation */}
                  <div>
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
                  <div></div>
                  
                  {/* First Name */}
                  <div>
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
                  
                  {/* Last Name */}
                  <div>
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
                  
                  {/* Birth Date */}
                  <div>
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
                  
                  {/* Phone */}
                  <div>
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
                  
                  {/* Email */}
                  <div>
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
                  
                  {/* Address */}
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse*
                    </label>
                    <input 
                      type="text" 
                      id="address" 
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Straße Nr, PLZ Ort"
                      className={`w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                        validationErrors.address ? 'ring-2 ring-red-500 bg-red-50' : 'focus:ring-blue-500'
                      }`}
                      required
                    />
                    {validationErrors.address && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.address}</p>
                    )}
                  </div>

                  {/* Current Insurer */}
                  <div>
                    <label htmlFor="currentInsurer" className="block text-sm font-medium text-gray-700 mb-1">
                      Aktuelle Krankenversicherung*
                    </label>
                    <select 
                      id="currentInsurer" 
                      value={formData.currentInsurer}
                      onChange={handleInputChange}
                      className={`w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
                        validationErrors.currentInsurer ? 'ring-2 ring-red-500 bg-red-50' : 'focus:ring-blue-500'
                      }`}
                      required
                    >
                      <option value="">Bitte wählen...</option>
                      {swissInsuranceCompanies.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                    {validationErrors.currentInsurer && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.currentInsurer}</p>
                    )}
                  </div>

                  {/* Current Policy Number */}
                  <div>
                    <label htmlFor="currentPolicyNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Aktuelle Policenummer
                    </label>
                    <input 
                      type="text" 
                      id="currentPolicyNumber" 
                      value={formData.currentPolicyNumber}
                      onChange={handleInputChange}
                      placeholder="Optional - hilft bei der Kündigung"
                      className="w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors" 
                    />
                  </div>

                  <div>
                    <label htmlFor="idDocument" className="block text-sm font-medium text-gray-700 mb-1">
                      Ausweis Kopie
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="idDocument"
                        onChange={handleFileUpload}
                        accept="image/*,.pdf"
                        className="w-full bg-gray-100 border-0 rounded-lg p-3 pr-10 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white file:hidden transition-colors"
                      />
                      <Camera className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
                    </div>
                    {uploadedFile && (
                      <p className="text-sm text-green-600 mt-1">Datei ausgewählt: {uploadedFile.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="ahvNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      AHV-Nummer
                    </label>
                    <input 
                      type="text" 
                      id="ahvNumber" 
                      value={formData.ahvNumber}
                      onChange={handleInputChange}
                      placeholder="756.XXXX.XXXX.XX"
                      className="w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white placeholder:text-gray-400 transition-colors" 
                    />
                  </div>

                  <div>
                    <label htmlFor="insuranceStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Gewünschter Versicherungsbeginn
                    </label>
                    <input 
                      type="date" 
                      id="insuranceStartDate" 
                      value={formData.insuranceStartDate}
                      onChange={handleInputChange}
                      min="2025-01-01"
                      className="w-full bg-gray-100 border-0 rounded-lg p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors" 
                    />
                  </div>

                  <div>
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
                    <label htmlFor="informationArt45" className="ml-3 text-sm text-blue-600 font-semibold">
                      Information nach Art. 45*
                    </label>
                    {validationErrors.informationArt45 && (
                      <p className="ml-3 text-sm text-red-600">{validationErrors.informationArt45}</p>
                    )}
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
                    <label htmlFor="agbAccepted" className="ml-3 text-sm text-blue-600 font-semibold">
                      AGB*
                    </label>
                    {validationErrors.agbAccepted && (
                      <p className="ml-3 text-sm text-red-600">{validationErrors.agbAccepted}</p>
                    )}
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
                    <label htmlFor="mandateAccepted" className="ml-3 text-sm text-blue-600 font-semibold">
                      Auftrag und Vollmacht*
                    </label>
                    {validationErrors.mandateAccepted && (
                      <p className="ml-3 text-sm text-red-600">{validationErrors.mandateAccepted}</p>
                    )}
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
                    <label htmlFor="terminationAuthority" className="ml-3 text-sm text-blue-600 font-semibold">
                      Vollmacht zur Kündigung*
                    </label>
                    {validationErrors.terminationAuthority && (
                      <p className="ml-3 text-sm text-red-600">{validationErrors.terminationAuthority}</p>
                    )}
                  </div>
                  
                  <div className="flex items-start">
                    <input 
                      id="consultationInterest" 
                      type="checkbox" 
                      checked={formData.consultationInterest}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-blue-500 mt-1" 
                    />
                    <label htmlFor="consultationInterest" className="ml-3 text-sm text-gray-600 font-medium">
                      Interesse an einer Beratung
                    </label>
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