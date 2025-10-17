"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, Mail, FileText, Clock, ArrowRight, Home } from "lucide-react";

const SuccessPage: React.FC = () => {
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    // Get session data from storage
    const storedSession = sessionStorage.getItem("skribble_session");
    if (storedSession) {
      try {
        const data = JSON.parse(storedSession);
        setSessionData(data);
      } catch (error) {
        console.error("Error parsing session data:", error);
      }
    }
  }, []);

  const handleBackToHome = () => {
    sessionStorage.removeItem("skribble_session");
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 text-center">
        {/* Success Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Registrierung erfolgreich!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Ihre Krankenversicherung-Wechsel Anfrage wurde erfolgreich eingereicht.
        </p>

        {/* Details Card */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Was passiert als nächstes:
          </h3>

          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">E-Mail Bestätigung</p>
                <p className="text-sm text-gray-600">
                  Sie erhalten in Kürze eine E-Mail mit den Signatur-Links für Ihre Dokumente.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                <span className="text-blue-600 font-semibold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Dokumente signieren</p>
                <p className="text-sm text-gray-600">
                  Signieren Sie die Kündigung{sessionData?.currentInsurer && ` für ${sessionData.currentInsurer}`} und den Antrag{sessionData?.selectedInsurer && ` für ${sessionData.selectedInsurer}`} digital mit Skribble.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                <span className="text-blue-600 font-semibold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Automatische Verarbeitung</p>
                <p className="text-sm text-gray-600">
                  Nach der Signierung werden alle Dokumente automatisch an die Versicherungen gesendet.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start">
            <Mail className="w-6 h-6 text-amber-600 flex-shrink-0 mr-3 mt-0.5" />
            <div className="text-left">
              <h4 className="font-semibold text-amber-800 mb-2">
                Prüfen Sie Ihr E-Mail Postfach
              </h4>
              <p className="text-sm text-amber-700 mb-3">
                Die Signatur-Links werden an Ihre E-Mail-Adresse gesendet. Überprüfen Sie auch Ihren Spam-Ordner, falls Sie keine E-Mail erhalten.
              </p>
              <div className="flex items-center text-sm text-amber-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>E-Mail wird in 2-5 Minuten versendet</span>
              </div>
            </div>
          </div>
        </div>

        {/* Session Info */}
        {sessionData && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-sm">
            <p className="text-blue-700">
              <strong>Session-ID:</strong> {sessionData.sessionId}
            </p>
            {sessionData.currentInsurer && sessionData.selectedInsurer && (
              <p className="text-blue-700 mt-1">
                <strong>Wechsel:</strong> {sessionData.currentInsurer} → {sessionData.selectedInsurer}
              </p>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleBackToHome}
          className="w-full bg-black text-white font-semibold py-4 px-6 rounded-2xl hover:bg-gray-900 transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
        >
          <Home className="w-5 h-5 mr-2" />
          Zurück zur Startseite
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>

        {/* Contact Info */}
        <p className="text-sm text-gray-500 mt-6">
          Bei Fragen kontaktieren Sie uns unter{" "}
          <a href="mailto:info@findbetter.ch" className="text-blue-600 hover:text-blue-700 underline">
            info@findbetter.ch
          </a>
        </p>
      </div>
    </div>
  );
};

export default SuccessPage;
