"use client";
import React, { useState } from "react";
import InsuranceSelectionPopup from "./InsuranceSelectionPopup";

// --- Medal Icons ---
const GoldMedalIcon = () => (
  <svg
    className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M10 2a2 2 0 00-2 2v2.172a2 2 0 01-1.414 1.414L4.172 8a2 2 0 00-1.414 1.414V11.5a2 2 0 002 2h.343a2 2 0 011.414 1.414L7.828 16a2 2 0 003.536-1.414l-.707-2.829a2 2 0 011.414-1.414H15.5a2 2 0 002-2v-2.086a2 2 0 00-1.414-1.414L13.172 8A2 2 0 0111.757 6.586V4a2 2 0 00-2-2h-.001zM10 6a2 2 0 100 4 2 2 0 000-4z" />
  </svg>
);

const SilverMedalIcon = () => (
  <svg
    className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M10 2a2 2 0 00-2 2v2.172a2 2 0 01-1.414 1.414L4.172 8a2 2 0 00-1.414 1.414V11.5a2 2 0 002 2h.343a2 2 0 011.414 1.414L7.828 16a2 2 0 003.536-1.414l-.707-2.829a2 2 0 011.414-1.414H15.5a2 2 0 002-2v-2.086a2 2 0 00-1.414-1.414L13.172 8A2 2 0 0111.757 6.586V4a2 2 0 00-2-2h-.001zM10 6a2 2 0 100 4 2 2 0 000-4z" />
  </svg>
);

const BronzeMedalIcon = () => (
  <svg
    className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M10 2a2 2 0 00-2 2v2.172a2 2 0 01-1.414 1.414L4.172 8a2 2 0 00-1.414 1.414V11.5a2 2 0 002 2h.343a2 2 0 011.414 1.414L7.828 16a2 2 0 003.536-1.414l-.707-2.829a2 2 0 011.414-1.414H15.5a2 2 0 002-2v-2.086a2 2 0 00-1.414-1.414L13.172 8A2 2 0 0111.757 6.586V4a2 2 0 00-2-2h-.001zM10 6a2 2 0 100 4 2 2 0 000-4z" />
  </svg>
);

const getMedalIcon = (index: number) => {
  if (index === 0) return <GoldMedalIcon />;
  if (index === 1) return <SilverMedalIcon />;
  if (index === 2) return <BronzeMedalIcon />;
  return (
    <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 font-bold text-xs sm:text-sm">
      {index + 1}
    </div>
  );
};

const calculateSavings = (currentPremium: number, baselinePremium: number) => {
  const monthlySavings =
    parseFloat(baselinePremium.toString()) -
    parseFloat(currentPremium.toString());
  const annualSavings = monthlySavings * 12;
  return { monthly: monthlySavings, annual: annualSavings };
};

interface ComparisonResultProps {
  results: any[];
  debugInfo: any;
  searchCriteria: any;
}

const ComparisonResult: React.FC<ComparisonResultProps> = ({
  results,
  debugInfo,
  searchCriteria,
}) => {
  const [selectedInsurance, setSelectedInsurance] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showDetails, setShowDetails] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [allItems, setAllItems] = useState<any[]>([]);

  // Update allItems when results change
  React.useEffect(() => {
    // Reset states first
    setAllItems([]);
    setShowDetails({});

    let extractedItems = [];

    if (results && results.length > 0) {
      console.log("Results structure:", JSON.stringify(results, null, 2));

      // Check if results[0] has the expected structure
      if (
        results[0].products &&
        results[0].products[0] &&
        results[0].products[0].items
      ) {
        extractedItems = results[0].products[0].items;
        console.log("Found items in products[0].items");
      } else if (Array.isArray(results[0])) {
        // If results[0] is directly an array of items
        extractedItems = results[0];
        console.log("Found items as direct array in results[0]");
      } else if (results[0].items) {
        // If results[0] has items directly
        extractedItems = results[0].items;
        console.log("Found items directly in results[0].items");
      } else {
        // Try to find items anywhere in the structure
        const findItems = (obj) => {
          if (Array.isArray(obj)) {
            return obj;
          }
          if (obj && typeof obj === "object") {
            for (const key in obj) {
              if (key === "items" && Array.isArray(obj[key])) {
                return obj[key];
              }
              if (typeof obj[key] === "object") {
                const found = findItems(obj[key]);
                if (found) return found;
              }
            }
          }
          return null;
        };

        const foundItems = findItems(results);
        if (foundItems) {
          extractedItems = foundItems;
          console.log("Found items by searching through structure");
        }
      }
    }

    console.log("Final extractedItems:", extractedItems);
    console.log("ExtractedItems length:", extractedItems.length);
    setAllItems(extractedItems);
  }, [results]);

  const handleSelectInsurance = (insurance: any) => {
    setSelectedInsurance(insurance);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedInsurance(null);
  };

  const toggleDetails = (index: number) => {
    setShowDetails((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const baselinePremium =
    allItems.length > 0
      ? Math.max(...allItems.map((item) => parseFloat(item.premium || 0)))
      : 0;

  return (
    <>
      <div className="bg-gray-50 p-4 sm:p-6 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] w-full max-w-5xl font-sans">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 px-1 sm:px-2">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">
            Vergleichsergebnisse{" "}
            {allItems.length > 0 ? `(${allItems.length})` : "(0)"}
          </h2>
          <span className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-0">
            Sortiert nach Preis
          </span>
        </div>

        {allItems && allItems.length > 0 ? (
          <div className="space-y-3">
            {allItems.map((item, index) => {
              const premium = parseFloat(item.premium || 0);
              const savings = calculateSavings(premium, baselinePremium);
              const isTopChoice = index < 3;

              return (
                <div
                  key={index}
                  className={`bg-white border rounded-xl shadow-sm transition-all duration-200 hover:shadow-md ${
                    isTopChoice
                      ? "border-gray-300 bg-gray-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center p-4 gap-4">
                    {/* Left: Medal + Info */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                      {getMedalIcon(index)}
                      <div>
                        <h3 className="font-bold text-gray-800 text-base sm:text-lg truncate">
                          {item.insurerName}
                        </h3>
                        <p className="text-gray-600 text-xs sm:text-sm">
                          {item.tariff}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Details badges (hidden on very small) */}
                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm sm:flex-1 sm:justify-center">
                      <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                        Franchise: CHF {results[0]?.franchise || "300"}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                        {results[0]?.accidentCoverage
                          ? "Mit Unfall"
                          : "Ohne Unfall"}
                      </span>
                    </div>

                    {/* Right: Price + Buttons */}
                    <div className="flex flex-col items-start sm:items-end gap-2 sm:ml-auto">
                      <div className="text-left sm:text-right">
                        <div className="text-lg sm:text-xl font-bold text-gray-800">
                          CHF {premium.toFixed(2)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          pro Monat
                        </div>
                        {savings.monthly > 0 && (
                          <div className="text-xs text-green-600 font-medium">
                            Spart CHF {savings.annual.toFixed(0)}/Jahr
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleSelectInsurance(item)}
                        className="px-4 py-2 rounded-lg font-semibold transition duration-200 text-sm bg-black text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
                      >
                        Wählen
                      </button>
                      <button
                        onClick={() => toggleDetails(index)}
                        className="px-3 py-1 rounded text-xs text-gray-600 hover:text-gray-800 transition border border-gray-300 hover:border-gray-400"
                      >
                        {showDetails[index] ? "Weniger" : "Details"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {showDetails[index] && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 px-3 sm:px-4 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs sm:text-sm">
                        <div>
                          <span className="font-medium text-gray-600">
                            Insurer ID:
                          </span>
                          <p className="text-gray-800">{item.insurerId}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">
                            Tariff Type:
                          </span>
                          <p className="text-gray-800">
                            {results[0]?.products?.[0]?.tariffType || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">
                            Savings:
                          </span>
                          <p className="text-gray-800">
                            CHF {item.savings?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">
                            Franchise:
                          </span>
                          <p className="text-gray-800">
                            CHF {results[0]?.franchise || "300"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 sm:py-12">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              Noch keine Ergebnisse
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              Bitte geben Sie Ihre Daten ein, um passende Krankenkassen-Angebote
              zu sehen.
            </p>
          </div>
        )}
      </div>

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
