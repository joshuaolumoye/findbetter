"use client";
import React, { useState } from 'react';

// --- Header Component ---
import Header from '../../../components/Header';


// --- Success Popup Component ---
const SuccessPopup = ({ onClose }) => {
  return (
    <div className="fixed mt-20 inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto p-8 text-center">
        <h2 className="text-5xl font-bold text-gray-800 mb-4">Fertig</h2>
        
        <div className="flex justify-center items-center mb-6">
            <div className="bg-indigo-500 rounded-full p-2">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
        </div>

        <p className="text-lg text-gray-500 mb-8">
          Ihre Daten wurden Erfolgreich übermittelt.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <button className="w-full sm:w-auto px-6 py-3 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition">
            Unterlagen Herunterladen
          </button>
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 bg-black text-white font-semibold rounded-md hover:bg-gray-800 transition">
            zurück zur startseite
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Main App Component ---
export default function App() {
  const [isSuccessPopupOpen, setIsSuccessPopupOpen] = useState(false);

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    // Collect form data
    const data = {
      telefon: event.target.telefon.value,
      name: event.target.name.value,
      // ...other fields...
    };
    // POST to your backend
    await fetch("/api/cancellation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setIsSuccessPopupOpen(true);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      <Header />

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* --- Offer Preview Section --- */}
        <section className="mb-16">
          <h2 className="text-3xl font-light mb-2">Vorschau Ihrer Offerte</h2>
          <p className="text-sm text-gray-500 mb-6 border-b pb-4">Aktualisiert am 03.05.2024</p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-semibold text-sm py-3 pr-3">Produkt</th>
                  <th className="text-left font-semibold text-sm py-3 pr-3">Beschreibung</th>
                  <th className="text-right font-semibold text-sm py-3 pl-3">Prämie pro Monat</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-4 pr-3 align-top">
                    <p className="font-semibold">Basis</p>
                    <p className="text-xs text-gray-500">Obligatorische Krankenpflegeversicherung</p>
                  </td>
                  <td className="py-4 pr-3 text-sm text-gray-600 align-top">
                    <p>Franchise: CHF 2500.00, Unfalldeckung: mit Unfalldeckung, Leistungserbringer: freie Wahl, Modell: BeneFit PLUS Hausarzt/HMO</p>
                  </td>
                  <td className="py-4 pl-3 text-right font-semibold align-top">CHF 308.60</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 pr-3 align-top">
                    <p className="font-semibold">TOP</p>
                  </td>
                  <td className="py-4 pr-3 text-sm text-gray-600 align-top">
                    <p>Beiträge an Brillen/Kontaktlinsen, nicht kassenpflichtige Medikamente und Transporte</p>
                  </td>
                  <td className="py-4 pl-3 text-right font-semibold align-top">CHF 11.70</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" className="text-left font-bold py-4">Total Nettoprämie pro Monat</td>
                  <td className="text-right font-bold py-4">CHF 320.30</td>
                </tr>
              </tfoot>
            </table>
          </div>
           <p className="text-xs text-gray-400 mt-4">
            Diese Offerte ist unverbindlich und basiert auf Ihren Angaben. Die definitive Prämie wird mit der Police festgesetzt. Sie finden diese auf helsana.ch/myhelsana.
          </p>
        </section>

        {/* --- Cancellation Section Form --- */}
        <form onSubmit={handleFormSubmit}>
          <section className="border-t pt-10 mb-16">
            <h2 className="text-3xl font-light mb-8">Ihr Kündigung</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {/* Left Column */}
                  <div>
                      <h3 className="font-semibold mb-4">Fragen Sie Ihren Absender der</h3>
                      <div className="space-y-4">
                          <div>
                              <label htmlFor="telefon" className="block text-xs text-gray-500">Telefon</label>
                              <input type="text" id="telefon" className="w-full border-b mt-1 focus:outline-none focus:border-blue-500"/>
                          </div>
                          <div>
                              <label htmlFor="name" className="block text-xs text-gray-500">Name</label>
                              <input type="text" id="name" defaultValue="Mustafa Karaca" readOnly className="w-full border-b mt-1 bg-transparent"/>
                          </div>
                          <div>
                              <label htmlFor="strasse-nummer" className="block text-xs text-gray-500">Strasse, Nummer</label>
                              <input type="text" id="strasse-nummer" className="w-full border-b mt-1 focus:outline-none focus:border-blue-500"/>
                          </div>
                          <div>
                              <label htmlFor="postleitzahl" className="block text-xs text-gray-500">Postleitzahl, Ort</label>
                              <input type="text" id="postleitzahl" className="w-full border-b mt-1 focus:outline-none focus:border-blue-500"/>
                          </div>
                      </div>
                  </div>
                  {/* Right Column */}
                  <div>
                      <h3 className="font-semibold mb-4">Fragen Sie die Adresse Ihre Krankenversicherung ein</h3>
                      <div className="space-y-4">
                          <div>
                              <label htmlFor="kranken-name" className="block text-xs text-gray-500">Name der Krankenversicherung</label>
                              <input type="text" id="kranken-name" className="w-full border-b mt-1 focus:outline-none focus:border-blue-500"/>
                          </div>
                          <div>
                              <label htmlFor="kranken-strasse" className="block text-xs text-gray-500">Strasse, Nummer</label>
                              <input type="text" id="kranken-strasse" className="w-full border-b mt-1 focus:outline-none focus:border-blue-500"/>
                          </div>
                          <div>
                              <label htmlFor="kranken-postleitzahl" className="block text-xs text-gray-500">Postleitzahl, Ort</label>
                              <input type="text" id="kranken-postleitzahl" className="w-full border-b mt-1 focus:outline-none focus:border-blue-500"/>
                          </div>
                      </div>
                  </div>
            </div>

            <div className="mt-12">
                  <h3 className="font-semibold text-lg">Kündigung der obligatorischen Krankenpflegeversicherung (Grundversicherung)</h3>
                  <p className="text-sm mt-4">Sehr geehrte Damen und Herren</p>
                  <p className="text-sm mt-4">
                      Hiermit kündige ich meine Grundversicherung per 31. Dezember 2024. Ich weise Sie darauf hin, dass ich bei einer anderen Kasse eine neue Grundversicherung abgeschlossen habe.
                  </p>
                  <p className="text-sm mt-4">
                      Besten Dank für die Ausführung des Auftrags. Mit freundlichen Grüssen erwarte ich Ihre Bestätigung zu.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8">
                      <div>
                          <label htmlFor="ort-datum" className="block text-xs text-gray-500">Postleitzahl, Ort und Datum</label>
                          <input type="text" id="ort-datum" defaultValue="Helsana, 03.05.2024" readOnly className="w-full border-b mt-1 bg-transparent"/>
                      </div>
                      <div>
                          <label htmlFor="unterschrift" className="block text-xs text-gray-500">Unterschrift</label>
                          <div className="w-full border-b mt-1 h-8"></div>
                      </div>
                  </div>
            </div>
          </section>

          {/* --- Action Buttons --- */}
          <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                  <button type="button" className="w-full sm:w-auto px-8 py-3 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 transition">
                      Zurück
                  </button>
                  <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-black text-white font-semibold rounded-md hover:bg-gray-800 transition">
                      Weiter & Kündigung Senden
                  </button>
              </div>
          </footer>
        </form>
      </main>

      {/* Conditionally render the popup */}
      {isSuccessPopupOpen && <SuccessPopup onClose={() => setIsSuccessPopupOpen(false)} />}
    </div>
  );
}
