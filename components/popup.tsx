import React, { useState, useEffect, useRef } from 'react';

// Reusable hook for detecting clicks outside a component
const useOnClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};


// Popup Component
const Popup = ({ onClose }) => {
  const popupRef = useRef(null);
  useOnClickOutside(popupRef, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div ref={popupRef} className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-auto p-6 sm:p-8 lg:p-10 transform transition-all duration-300 ease-in-out scale-95 hover:scale-100">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6 sm:mb-8">
          Personen Angaben
        </h2>
        <form action="#" method="POST">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Vorname */}
            <div>
              <label htmlFor="vorname" className="block text-sm font-medium text-gray-700 mb-1">Vorname*</label>
              <input type="text" name="vorname" id="vorname" required className="w-full px-4 py-3 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition" />
            </div>
            {/* Nachname */}
            <div>
              <label htmlFor="nachname" className="block text-sm font-medium text-gray-700 mb-1">Nachname*</label>
              <input type="text" name="nachname" id="nachname" required className="w-full px-4 py-3 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition" />
            </div>
            {/* Geburtsdatum */}
            <div>
              <label htmlFor="geburtsdatum" className="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum*</label>
              <input type="date" name="geburtsdatum" id="geburtsdatum" required className="w-full px-4 py-3 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition" />
            </div>
            {/* Telefonnummer */}
            <div>
              <label htmlFor="telefonnummer" className="block text-sm font-medium text-gray-700 mb-1">Telefonnummer*</label>
              <input type="tel" name="telefonnummer" id="telefonnummer" required className="w-full px-4 py-3 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition" />
            </div>
            {/* E-mail */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail*</label>
              <input type="email" name="email" id="email" required className="w-full px-4 py-3 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition" />
            </div>
            {/* Adresse */}
            <div>
              <label htmlFor="adresse" className="block text-sm font-medium text-gray-700 mb-1">Adresse*</label>
              <input type="text" name="adresse" id="adresse" required className="w-full px-4 py-3 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition" />
            </div>
            {/* Policennummer */}
            <div>
              <label htmlFor="policennummer" className="block text-sm font-medium text-gray-700 mb-1">Policennummer Ihrer aktuellen Versicherung*</label>
              <input type="text" name="policennummer" id="policennummer" required className="w-full px-4 py-3 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition" />
            </div>
            {/* Ausweis kopie */}
            <div className="relative">
              <label htmlFor="ausweis" className="block text-sm font-medium text-gray-700 mb-1">Ausweis kopie*</label>
              <div className="flex items-center">
                <div className="relative flex-grow">
                    <input type="file" name="ausweis" id="ausweis" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="flex items-center justify-between w-full px-4 py-3 bg-gray-100 border-transparent rounded-lg">
                        <span className="text-gray-500">Datei auswählen...</span>
                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                </div>
                <button type="button" className="ml-3 p-3 bg-yellow-400 text-white rounded-full hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </button>
              </div>
            </div>
             {/* Checkboxes */}
            <div className="md:col-span-1 space-y-3 pt-4">
                <div className="flex items-center">
                    <input id="info" name="info" type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <label htmlFor="info" className="ml-3 block text-sm text-gray-700">Information nach Art. 45*</label>
                </div>
                <div className="flex items-center">
                    <input id="agb" name="agb" type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <label htmlFor="agb" className="ml-3 block text-sm text-gray-700">AGB*</label>
                </div>
                <div className="flex items-center">
                    <input id="auftrag" name="auftrag" type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <label htmlFor="auftrag" className="ml-3 block text-sm text-gray-700">Auftrag und Vollmacht*</label>
                </div>
                 <div className="flex items-center">
                    <input id="verzicht" name="verzicht" type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <label htmlFor="verzicht" className="ml-3 block text-sm text-gray-700">Verzicht zur Kündigung*</label>
                </div>
                 <div className="flex items-center">
                    <input id="interesse" name="interesse" type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    <label htmlFor="interesse" className="ml-3 block text-sm text-gray-700">Interesse an einer Beratung</label>
                </div>
            </div>
            {/* Versicherungsbeginn */}
            <div className="relative">
              <label htmlFor="versicherungsbeginn" className="block text-sm font-medium text-gray-700 mb-1">Versicherungsbeginn*</label>
              <div className="flex items-center">
                <input type="text" name="versicherungsbeginn" id="versicherungsbeginn" defaultValue="z.B 01.01.2024" required className="w-full px-4 py-3 bg-gray-100 border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition" />
                 <button type="button" className="ml-3 p-3 bg-yellow-400 text-white rounded-full hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </button>
              </div>
            </div>
          </div>
          {/* Submit Button */}
          <div className="mt-8 sm:mt-10 text-center">
            <button type="submit" className="w-full sm:w-auto inline-flex justify-center items-center px-12 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 transition">
              Weiter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};