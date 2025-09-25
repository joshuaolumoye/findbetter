// app/demo/skribble-signing/DemoSkribbleSigning.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PenTool, FileText, CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react';

function DemoSkribbleSigning() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionData, setSessionData] = useState({
    sessionId: '',
    userEmail: '',
    returnUrl: ''
  });

  useEffect(() => {
    // Get URL parameters
    const sessionId = searchParams.get('session') || '';
    const userEmail = searchParams.get('user') || '';
    const returnUrl = decodeURIComponent(searchParams.get('return') || '/');

    setSessionData({ sessionId, userEmail, returnUrl });

    // Start the demo signing process after 2 seconds
    const timer = setTimeout(() => {
      if (sessionId && userEmail) {
        startDemoSigning();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const startDemoSigning = () => {
    setIsProcessing(true);
    
    // Simulate signing steps
    const steps = [
      { step: 1, delay: 2000, title: 'Dokumente werden geladen...' },
      { step: 2, delay: 3000, title: 'Kündigung wird signiert...' },
      { step: 3, delay: 2500, title: 'Versicherungsantrag wird signiert...' },
      { step: 4, delay: 1500, title: 'Dokumente werden übermittelt...' },
    ];

    let totalDelay = 0;
    steps.forEach(({ step, delay, title }) => {
      totalDelay += delay;
      setTimeout(() => {
        setCurrentStep(step);
      }, totalDelay);
    });

    // Complete the process
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep(5);
      
      // Redirect back to success page after 2 seconds
      setTimeout(() => {
        window.location.href = sessionData.returnUrl + '?signed=true&demo=true';
      }, 2000);
    }, totalDelay + 1000);
  };

  const documents = [
    {
      title: 'KVG Kündigung 2024',
      description: 'Kündigung der aktuellen Krankenversicherung',
      icon: FileText,
      color: 'text-red-600 bg-red-50'
    },
    {
      title: 'Neuer Versicherungsantrag',
      description: 'Antrag für die neue Krankenversicherung',
      icon: FileText,
      color: 'text-blue-600 bg-blue-50'
    }
  ];

  const getStepStatus = (stepNumber: number) => {
    if (currentStep > stepNumber) return 'completed';
    if (currentStep === stepNumber) return 'active';
    return 'pending';
  };

  const getStepIcon = (stepNumber: number) => {
    const status = getStepStatus(stepNumber);
    if (status === 'completed') return <CheckCircle className="w-5 h-5" />;
    if (status === 'active') return <div className="w-5 h-5 border-2 border-blue-600 rounded-full animate-pulse" />;
    return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <PenTool className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Skribble Demo Signierung
          </h1>
          <p className="text-gray-600">
            Session: {sessionData.sessionId}
          </p>
          {sessionData.userEmail && (
            <p className="text-sm text-gray-500">
              Benutzer: {sessionData.userEmail}
            </p>
          )}
        </div>

        {/* Demo Warning */}
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-800 mb-1">Demo-Modus</p>
              <p className="text-yellow-700">
                Dies ist eine Simulation des Skribble-Signierungsprozesses. 
                In der echten Anwendung würden Sie eine qualifizierte elektronische Signatur (QES) verwenden.
              </p>
            </div>
          </div>
        </div>

        {/* Documents to Sign */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Zu signierende Dokumente</h3>
          <div className="space-y-4">
            {documents.map((doc, index) => {
              const Icon = doc.icon;
              const isActive = currentStep === index + 2;
              const isCompleted = currentStep > index + 2;
              
              return (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCompleted ? 'border-green-200 bg-green-50' : 
                    isActive ? 'border-blue-200 bg-blue-50 shadow-md' : 
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-lg ${doc.color} flex items-center justify-center mr-4`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{doc.title}</h4>
                      <p className="text-sm text-gray-600">{doc.description}</p>
                    </div>
                    <div className="ml-4">
                      {isCompleted && <CheckCircle className="w-6 h-6 text-green-600" />}
                      {isActive && <Clock className="w-6 h-6 text-blue-600 animate-spin" />}
                      {!isActive && !isCompleted && <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              'Initialisierung',
              'Dokumente laden',
              'Kündigung signieren',
              'Antrag signieren',
              'Übermittlung'
            ].map((title, index) => (
              <React.Fragment key={index}>
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                    getStepStatus(index) === 'completed' ? 'bg-green-600 text-white' :
                    getStepStatus(index) === 'active' ? 'bg-blue-600 text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {getStepIcon(index)}
                  </div>
                  <span className={`mt-2 text-xs font-medium text-center ${
                    currentStep >= index ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {title}
                  </span>
                </div>
                {index < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    currentStep > index ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Status Messages */}
        <div className="text-center">
          {currentStep === 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800 font-medium">Signierungsprozess wird gestartet...</p>
            </div>
          )}
          
          {currentStep === 1 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-blue-600 animate-spin mr-2" />
                <p className="text-blue-800 font-medium">Dokumente werden geladen...</p>
              </div>
              <p className="text-sm text-blue-700">PDF-Dateien werden für die Signierung vorbereitet</p>
            </div>
          )}

          {currentStep === 2 && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <PenTool className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-yellow-800 font-medium">Kündigung wird signiert...</p>
              </div>
              <p className="text-sm text-yellow-700">QES-Signatur wird auf Kündigungsdokument angewendet</p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <PenTool className="w-5 h-5 text-blue-600 mr-2" />
                <p className="text-blue-800 font-medium">Versicherungsantrag wird signiert...</p>
              </div>
              <p className="text-sm text-blue-700">QES-Signatur wird auf Antragsdokument angewendet</p>
            </div>
          )}

          {currentStep === 4 && (
            <div className="p-4 bg-indigo-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <ArrowRight className="w-5 h-5 text-indigo-600 animate-pulse mr-2" />
                <p className="text-indigo-800 font-medium">Dokumente werden übermittelt...</p>
              </div>
              <p className="text-sm text-indigo-700">Signierte Dokumente werden an die Versicherungen gesendet</p>
            </div>
          )}

          {currentStep === 5 && (
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-green-800 font-medium">Signierung erfolgreich abgeschlossen!</p>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Alle Dokumente wurden erfolgreich signiert und übermittelt.
              </p>
              <p className="text-xs text-green-600">
                Sie werden automatisch weitergeleitet...
              </p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>Demo-Simulation der Skribble QES-Signierung</p>
          <p className="mt-1">In der Produktion würden Sie echte qualifizierte elektronische Signaturen verwenden</p>
        </div>
      </div>
    </div>
  );
}

export default DemoSkribbleSigning;