"use client";
import React, { useState } from "react";
import InsuranceSelectionPopup from "./InsuranceSelectionPopup";

// Medal Icons
const GoldMedalIcon = () => (
  <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 2a2 2 0 00-2 2v2.172a2 2 0 01-1.414 1.414L4.172 8a2 2 0 00-1.414 1.414V11.5a2 2 0 002 2h.343a2 2 0 011.414 1.414L7.828 16a2 2 0 003.536-1.414l-.707-2.829a2 2 0 011.414-1.414H15.5a2 2 0 002-2v-2.086a2 2 0 00-1.414-1.414L13.172 8A2 2 0 0111.757 6.586V4a2 2 0 00-2-2h-.001zM10 6a2 2 0 100 4 2 2 0 000-4z" />
  </svg>
);

const SilverMedalIcon = () => (
  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 2a2 2 0 00-2 2v2.172a2 2 0 01-1.414 1.414L4.172 8a2 2 0 00-1.414 1.414V11.5a2 2 0 002 2h.343a2 2 0 011.414 1.414L7.828 16a2 2 0 003.536-1.414l-.707-2.829a2 2 0 011.414-1.414H15.5a2 2 0 002-2v-2.086a2 2 0 00-1.414-1.414L13.172 8A2 2 0 0111.757 6.586V4a2 2 0 00-2-2h-.001zM10 6a2 2 0 100 4 2 2 0 000-4z" />
  </svg>
);

const BronzeMedalIcon = () => (
  <svg className="w-8 h-8 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 2a2 2 0 00-2 2v2.172a2 2 0 01-1.414 1.414L4.172 8a2 2 0 00-1.414 1.414V11.5a2 2 0 002 2h.343a2 2 0 011.414 1.414L7.828 16a2 2 0 003.536-1.414l-.707-2.829a2 2 0 011.414-1.414H15.5a2 2 0 002-2v-2.086a2 2 0 00-1.414-1.414L13.172 8A2 2 0 0111.757 6.586V4a2 2 0 00-2-2h-.001zM10 6a2 2 0 100 4 2 2 0 000-4z" />
  </svg>
);

const getMedalIcon = (index: number) => {
  if (index === 0) return <GoldMedalIcon />;
  if (index === 1) return <SilverMedalIcon />;
  if (index === 2) return <BronzeMedalIcon />;
  return <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 font-bold text-sm">{index + 1}</div>;
};

const calculateSavings = (currentPremium: number, baselinePremium: number) => {
  const monthlySavings = parseFloat(baselinePremium.toString()) - parseFloat(currentPremium.toString());
  const annualSavings = monthlySavings * 12;
  return { monthly: monthlySavings, annual: annualSavings };
};

interface ComparisonResultProps {
  results: any[];
  debugInfo: any;
  searchCriteria: any;
}

const ComparisonResult: React.FC<ComparisonResultProps> = ({ results, debugInfo, searchCriteria }) => {
  const [selectedInsurance, setSelectedInsurance] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showDetails, setShowDetails] = useState<{[key: number]: boolean}>({});

  const handleSelectInsurance = (insurance: any) => {
    setSelectedInsurance(insurance);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedInsurance(null);
  };

  const toggleDetails = (index: number) => {
    setShowDetails(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Calculate baseline premium (highest premium for savings calculation)
  const baselinePremium = results && results.length > 0 ? 
    Math.max(...results.map(r => parseFloat(r.Bonus || r.Praemie || 0))) : 0;

  return (
    <>
      <div className="bg-gray-50 p-6 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] w-full max-w-4xl font-sans">
        <div className="flex justify-between items-center mb-6 px-2">
          <h2 className="text-xl font-bold text-gray-800">
            Vergleichsergebnisse {results ? `(${results.length})` : '(0)'}
          </h2>
          <span className="text-sm text-gray-500">
            Sortiert nach Preis
          </span>
        </div>

        <div>
          {results && results.length > 0 ? (
            <div className="space-y-3">
              {results.map((result, index) => {
                const premium = parseFloat(result.Bonus || result.Praemie || 0);
                const savings = calculateSavings(premium, baselinePremium);
                const isTopChoice = index < 3;
                
                return (
                  <div 
                    key={index} 
                    className={`bg-white border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-300 ${
                      isTopChoice ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center p-4">
                      <div className="flex-shrink-0 mr-4">
                        {getMedalIcon(index)}
                      </div>
                      
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-6">
                            <div className="min-w-0">
                              <h3 className="font-bold text-gray-800 text-lg truncate">
                                {result.Insurer || result.Versicherer}
                              </h3>
                              <p className="text-gray-600 text-sm">
                                {result['Tariff name'] || result.Modell}
                              </p>
                            </div>
                            
                            <div className="hidden sm:flex items-center space-x-4 text-sm">
                              <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                                Franchise: CHF {result.Franchise}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                                {result['Accident Inclusion'] === 'With accident' || result.Unfalldeckung === 'Mit Unfalldeckung' ? 
                                  'Mit Unfall' : 'Ohne Unfall'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="text-xl font-bold text-gray-800">
                                CHF {premium.toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500">pro Monat</div>
                              {savings.monthly > 0 && (
                                <div className="text-xs text-green-600 font-medium">
                                  Spart CHF {savings.annual.toFixed(0)}/Jahr
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col space-y-2">
                              <button
                                onClick={() => handleSelectInsurance(result)}
                                className="px-4 py-2 rounded-lg font-semibold transition duration-200 text-sm bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                Wählen
                              </button>
                              <button
                                onClick={() => toggleDetails(index)}
                                className="px-4 py-1 rounded text-xs text-gray-600 hover:text-gray-800 transition border border-gray-300 hover:border-gray-400"
                              >
                                {showDetails[index] ? 'Weniger' : 'Details'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {showDetails[index] && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-600">Region:</span>
                                <p className="text-gray-800">{result.Region || result.Kanton}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Altersgruppe:</span>
                                <p className="text-gray-800">{result['Age group'] || result.AgeRange}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">PLZ:</span>
                                <p className="text-gray-800">{result['Postal code'] || result.PLZ}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Jahr:</span>
                                <p className="text-gray-800">{result['Fiscal year'] || result.Jahr || '2025'}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Ergebnisse</h3>
              <p className="text-gray-600 text-sm">
                Bitte geben Sie Ihre Daten ein, um passende Krankenkassen-Angebote zu sehen.
              </p>
            </div>
          )}
        </div>

        {debugInfo && (
          <div className="mt-8 p-6 bg-gray-100 border border-gray-200 rounded-xl text-gray-800">
            <h4 className="font-bold text-lg mb-4 text-gray-600">Debug Information</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="mb-2"><span className="font-semibold">Total Records:</span> {debugInfo.totalRecords}</p>
                <p className="mb-2"><span className="font-semibold">Filtered Records:</span> {debugInfo.filteredRecords}</p>
                <p className="mb-2"><span className="font-semibold">Processing Time:</span> {debugInfo.processingTime} ms</p>
              </div>  
              <div>
                <p className="mb-2"><span className="font-semibold">API Endpoint:</span> {debugInfo.apiEndpoint}</p>
                <p className="mb-2"><span className="font-semibold">Query Parameters:</span> {JSON.stringify(debugInfo.queryParams)}</p>
                <p className="mb-2"><span className="font-semibold">Timestamp:</span> {new Date(debugInfo.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Insurance Selection Popup */}
      <InsuranceSelectionPopup
        selectedInsurance={selectedInsurance}
        searchCriteria={searchCriteria}
        onClose={closePopup}
        isOpen={showPopup}
      />
    </>
  );
};

export default ComparisonResult;