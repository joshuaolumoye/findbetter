"use client";
import React, { useState } from "react";
import PremiumCalculator from "../../components/PremiumCalculator";
import ComparisonResult from "../../components/ComparisonResult";
import AdditionalPersonForm from "../../components/AdditionalPersonForm";
import FAQ from "../../components/faq";
import Footer from "../../components/Footer";
import Header from "../../components/Header";

const StarIcon = () => (
  <svg
    className="w-5 h-5 text-white"
    fill="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
  </svg>
);

const GreenCheckIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="10" cy="10" r="10" fill="#00B67A" />
    <path
      d="M6 10.5L8.66667 13L14 8"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrustpilotRating = () => (
  <div className="inline-flex items-center justify-center space-x-4 bg-white p-3 pr-5 rounded-lg border border-green-200 shadow-sm mx-auto">
    <div className="flex items-center space-x-2">
      <GreenCheckIcon />
      <div className="flex bg-green-500 p-1 rounded-sm">
        <StarIcon />
      </div>
      <span className="font-bold text-gray-800">Trustpilot</span>
    </div>
    <div className="text-left">
      <p className="font-semibold text-gray-700 text-sm">
        Hervorragend, das ist eines der Merkmale von uns!
      </p>
      <p className="text-xs text-gray-500">
        einfach und unkompliziert mehr wollte ich nicht.
      </p>
    </div>
  </div>
);

export default function Home() {
  const [allPersonsResults, setAllPersonsResults] = useState([
    { items: [], data: null }
  ]);
  const [additionalPeople, setAdditionalPeople] = useState([]);
  const [regionData, setRegionData] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const extractItemsFromResults = (results) => {
    let extractedItems = [];
    if (results && results.length > 0) {
      if (results[0].products && results[0].products[0] && results[0].products[0].items) {
        extractedItems = results[0].products[0].items;
      } else if (Array.isArray(results[0])) {
        extractedItems = results[0];
      } else if (results[0].items) {
        extractedItems = results[0].items;
      } else {
        const findItems = (obj) => {
          if (Array.isArray(obj)) return obj;
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
        if (foundItems) extractedItems = foundItems;
      }
    }
    return extractedItems;
  };

  const handleResults = (results, personIndex) => {
    console.log("Results for person", personIndex, results);
    
    const extractedItems = extractItemsFromResults(results);

    setAllPersonsResults(prev => {
      const updated = [...prev];
      updated[personIndex] = {
        items: extractedItems,
        data: results[0] || null
      };
      return updated;
    });
  };

  const handleSearchCriteria = (criteria, region) => {
    console.log("Search criteria:", criteria);
    setRegionData(region);
  };

  const handleAddPerson = () => {
    const newIndex = additionalPeople.length + 1;
    setAdditionalPeople([...additionalPeople, newIndex]);
    setAllPersonsResults(prev => [...prev, { items: [], data: null }]);
  };

  const handleRemovePerson = (indexToRemove) => {
    setAdditionalPeople(prev => prev.filter((_, i) => i !== indexToRemove));
    setAllPersonsResults(prev => prev.filter((_, i) => i !== indexToRemove + 1));
  };

  return (
    <main className="bg-white min-h-screen font-sans text-gray-900">
      <Header />

      <div className="container mx-auto px-6 py-12 sm:py-16 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Kein Bock mehr, es dir machen zu lassen?
        </h1>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
          fang an es dir selber zu machen.
        </h2>
        <p className="max-w-xl mx-auto text-gray-600 mb-8 text-base">
          Der widerwilligste und letzte Krankenkassenvergleich der Schweiz.
          Inklusive Kündigung in nur 4 Schritten.
        </p>

        <TrustpilotRating />

        <p className="text-xs text-gray-500 mt-3">
          4.9 Bewertungen auf Trustpilot
        </p>

        <div className="mt-20 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 leading-tight">
            Über 1.000 Kunden machen es sich mittlerweile
            <br />
            selber du noch etwa nicht?
          </h3>
          <p className="text-lg text-gray-600">Probiere es aus!</p>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-20">
        <div className="flex flex-col lg:flex-row justify-center items-start gap-8 relative">
          {/* Left side - Forms */}
          <div className="space-y-6 lg:w-auto flex-shrink-0">
            <PremiumCalculator
              onResults={handleResults}
              onDebugInfo={setDebugInfo}
              onSearchCriteria={handleSearchCriteria}
              onAddPerson={handleAddPerson}
              regionData={regionData}
            />

            {additionalPeople.map((person, index) => (
              <AdditionalPersonForm
                key={index}
                personIndex={index + 1}
                onResults={handleResults}
                regionData={regionData}
                onRemove={() => handleRemovePerson(index)}
              />
            ))}
          </div>

          {/* Right side - Results */}
          <div className="lg:flex-1">
            <ComparisonResult
              allPersonsResults={allPersonsResults}
              debugInfo={debugInfo}
            />
          </div>
        </div>
      </div>
      
      <FAQ />
      <Footer />
    </main>
  );
}