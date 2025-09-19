// app/insurance/error/page.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Home, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function InsuranceErrorPage() {
  const router = useRouter();
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    // Get error details from URL params or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error') || 'Unbekannter Fehler bei der Dokumentensignierung';
    setErrorDetails(error);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Error Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Fehler bei der Signierung
          </h1>
          <p className="text-gray-600">
            Bei der digitalen Signierung Ihrer Versicherungsdokumente ist ein Fehler aufgetreten.
          </p>
        </div>

        {/* Error Details */}
        {errorDetails && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Fehlerdetails:</h2>
            <p className="text-red-800">{errorDetails}</p>
          </div>
        )}

        {/* What to do next */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Was können Sie jetzt tun:</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <RefreshCw className="w-5 h-5 text-blue-600 mr-3 mt-1" />
              <div>
                <h3 className="font-medium text-gray-900">Erneut versuchen</h3>
                <p className="text-sm text-gray-600">
                  Starten Sie den Versicherungsvergleich erneut und versuchen Sie die Signierung noch einmal.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <HelpCircle className="w-5 h-5 text-green-600 mr-3 mt-1" />
              <div>
                <h3 className="font-medium text-gray-900">Support kontaktieren</h3>
                <p className="text-sm text-gray-600">
                  Unser Kundenservice hilft Ihnen gerne bei technischen Problemen weiter.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Support Information */}
        <div className="border border-gray-200 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">Kontakt & Support:</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>📧 E-Mail: support@krankenversicherung-vergleich.ch</p>
            <p>📞 Telefon: +41 44 123 45 67</p>
            <p>🕒 Montag - Freitag, 08:00 - 18:00 Uhr</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Erneut versuchen
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:text-gray-800 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            Zur Startseite
          </button>
        </div>
      </div>
    </div>
  );
}

// app/insurance/cancel/page.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { XCircle, RefreshCw, Home, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function InsuranceCancelPage() {
  const router = useRouter();
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    // Retrieve session info if available
    const storedSession = sessionStorage.getItem('skribble_session');
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        setSessionInfo(session);
        // Clean up
        sessionStorage.removeItem('skribble_session');
      } catch (error) {
        console.error('Error parsing session info:', error);
      }
    }
  }, []);

  const handleContactSupport = () => {
    // You could open a chat widget, mailto, or redirect to contact page
    window.location.href = 'mailto:support@krankenversicherung-vergleich.ch?subject=Signierung abgebrochen - Unterstützung benötigt';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Cancel Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-12 h-12 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Signierung abgebrochen
          </h1>
          <p className="text-gray-600">
            Sie haben die digitale Signierung Ihrer Versicherungsdokumente abgebrochen.
          </p>
        </div>

        {/* Information */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-orange-900 mb-2">Was bedeutet das?</h2>
          <ul className="text-orange-800 space-y-1 text-sm">
            <li>• Ihre Dokumente wurden nicht signiert</li>
            <li>• Keine Kündigung wurde versendet</li>
            <li>• Kein neuer Versicherungsantrag wurde eingereicht</li>
            <li>• Ihre Daten bleiben sicher gespeichert</li>
          </ul>
        </div>

        {/* Next Steps */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Möchten Sie den Vorgang fortsetzen?</h2>
          <p className="text-gray-600 mb-4">
            Sie können jederzeit zu Ihrem Versicherungsvergleich zurückkehren und die Signierung zu einem späteren Zeitpunkt durchführen.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Erinnerung:</h3>
            <p className="text-sm text-blue-800">
              Der Stichtag für Krankenversicherungswechsel ist der 30. November. 
              Stellen Sie sicher, dass Sie rechtzeitig kündigen, um ab dem 1. Januar zu Ihrer neuen Versicherung zu wechseln.
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="border border-gray-200 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">Ihre Optionen:</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <RefreshCw className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Erneut signieren</p>
                <p className="text-sm text-gray-600">Starten Sie den Signierungsvorgang erneut</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <MessageCircle className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Beratung vereinbaren</p>
                <p className="text-sm text-gray-600">Lassen Sie sich persönlich beraten</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Erneut versuchen
          </button>
          
          <button
            onClick={handleContactSupport}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Support kontaktieren
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:text-gray-800 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            Zur Startseite
          </button>
        </div>
      </div>
    </div>
  );
}