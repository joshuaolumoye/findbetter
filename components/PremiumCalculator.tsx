"use client";
import React, { useState } from 'react';

const PremiumCalculator = ({ onResults, onDebugInfo, onSearchCriteria }) => {
  const [form, setForm] = useState({
    plz: "",
    geburtsdatum: "",
    franchise: "Franchise",
    unfalldeckung: "Unfalldeckung",
    aktuellesModell: "Aktuelles Modell",
    aktuelleKK: "Aktuelle KK",
    newToSwitzerland: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setForm({ ...form, [id]: newValue });
    
    if (validationErrors[id]) {
      setValidationErrors({ ...validationErrors, [id]: "" });
    }
    if (error) {
      setError("");
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!form.plz) {
      errors.plz = "Postleitzahl ist erforderlich";
    } else if (!/^\d{4}$/.test(form.plz)) {
      errors.plz = "Gültige Schweizer PLZ (4 Ziffern) eingeben";
    }
    
    if (!form.geburtsdatum) {
      errors.geburtsdatum = "Geburtsdatum ist erforderlich";
    } else {
      const birthDate = new Date(form.geburtsdatum);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      // if (birthDate > today) {
      //   errors.geburtsdatum = "Geburtsdatum kann nicht in der Zukunft liegen";
      // } 
       if (age > 120) {
        errors.geburtsdatum = "Bitte gültiges Geburtsdatum eingeben";
      } 
      // else if (age < 18) {
      //   errors.geburtsdatum = "Mindestalter 18 Jahre";
      // }
    }
    
    if (form.franchise === "Franchise") {
      errors.franchise = "Bitte Franchise auswählen";
    }
    if (form.unfalldeckung === "Unfalldeckung") {
      errors.unfalldeckung = "Bitte Unfalldeckung auswählen";
    }
    if (form.aktuellesModell === "Aktuelles Modell") {
      errors.aktuellesModell = "Bitte Modell auswählen";
    }
    if (form.aktuelleKK === "Aktuelle KK") {
      errors.aktuelleKK = "Bitte Krankenkasse auswählen";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Pass search criteria to parent component
      if (onSearchCriteria) {
        onSearchCriteria(form);
      }
      
      const response = await fetch("/api/premiums", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(form),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP Error: ${response.status}`);
      }
      
      const results = data.results || [];
      
      if (data.debug && onDebugInfo) {
        onDebugInfo(data.debug);
      }
      
      onResults(results);
      
      if (results.length === 0) {
        setError("Keine Versicherungen für Ihre Kriterien gefunden. Versuchen Sie andere Filter.");
      }
      
    } catch (err) {
      console.error("API Error:", err);
      setError(`Fehler beim Laden der Daten: ${err.message}`);
      onResults([]);
      if (onDebugInfo) onDebugInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const fillTestData = () => {
    setForm({
      plz: "8001",
      geburtsdatum: "1990-01-01",
      franchise: "300",
      unfalldeckung: "Mit Unfalldeckung",
      aktuellesModell: "Standard",
      aktuelleKK: "CSS",
      newToSwitzerland: false
    });
    setValidationErrors({});
    setError("");
  };

  const insuranceCompanies = [
    "Aktuelle KK", "Helsana", "CSS", "Swica", "Concordia", "Sanitas",
    "KPT", "Visana", "Groupe Mutuel", "GALENOS", "Assura", "Sympany",
    "ÖKK", "EGK-Gesundheitskasse", "Atupri",
  ];

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] w-full max-w-sm flex-shrink-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Ihre Angaben </h2>
        {process.env.NODE_ENV === 'development' && (
          <button
            type="button"
            onClick={fillTestData}
            className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
          >
            Test Data
          </button>
        )}
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="plz" className="block text-sm font-medium text-gray-500 mb-2">
            Postleitzahl *
          </label>
          <input 
            type="text" 
            id="plz" 
            value={form.plz} 
            onChange={handleChange} 
            placeholder="z.B. 8001"
            maxLength="4"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition ${
              validationErrors.plz 
                ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-200 bg-gray-50 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
          {validationErrors.plz && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.plz}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="geburtsdatum" className="block text-sm font-medium text-gray-500 mb-2">
            Geburtsdatum *
          </label>
          <input
            type="date"
            id="geburtsdatum"
            value={form.geburtsdatum}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition ${
              validationErrors.geburtsdatum 
                ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-200 bg-gray-50 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
          {validationErrors.geburtsdatum && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.geburtsdatum}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="franchise" className="block text-sm font-medium text-gray-500 mb-2">
            Franchise *
          </label>
          <select 
            id="franchise" 
            value={form.franchise} 
            onChange={handleChange} 
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition ${
              validationErrors.franchise 
                ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-200 bg-gray-50 text-gray-500 focus:ring-blue-500 focus:border-blue-500'
            }`}
          >
            <option value="Franchise">Franchise auswählen</option>
            <option value="300">CHF 300 (Minimum)</option>
            <option value="500">CHF 500</option>
            <option value="1000">CHF 1'000</option>
            <option value="1500">CHF 1'500</option>
            <option value="2000">CHF 2'000</option>
            <option value="2500">CHF 2'500 (Maximum)</option>
          </select>
          {validationErrors.franchise && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.franchise}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="unfalldeckung" className="block text-sm font-medium text-gray-500 mb-2">
            Unfall *
          </label>
          <select 
            id="unfalldeckung" 
            value={form.unfalldeckung} 
            onChange={handleChange} 
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition ${
              validationErrors.unfalldeckung 
                ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-200 bg-gray-50 text-gray-500 focus:ring-blue-500 focus:border-blue-500'
            }`}
          >
            <option value="Unfalldeckung">Unfalldeckung auswählen</option>
            <option value="Mit Unfalldeckung">Mit Unfalldeckung</option>
            <option value="Ohne Unfalldeckung">Ohne Unfalldeckung</option>
          </select>
          {validationErrors.unfalldeckung && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.unfalldeckung}</p>
          )}
        </div>
        <div className="mb-6">
          <label htmlFor="aktuelleKK" className="block text-sm font-medium text-gray-500 mb-2">
           Aktuelle KVG *
          </label>
          <select 
            id="aktuelleKK" 
            value={form.aktuelleKK} 
            onChange={handleChange} 
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition ${
              validationErrors.aktuelleKK 
                ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-200 bg-gray-50 text-gray-500 focus:ring-blue-500 focus:border-blue-500'
            }`}
          >
            {insuranceCompanies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
          {validationErrors.aktuelleKK && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.aktuelleKK}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="aktuellesModell" className="block text-sm font-medium text-gray-500 mb-2">
             Arzt Modell *
          </label>
          <select 
            id="aktuellesModell" 
            value={form.aktuellesModell} 
            onChange={handleChange} 
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition ${
              validationErrors.aktuellesModell 
                ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-200 bg-gray-50 text-gray-500 focus:ring-blue-500 focus:border-blue-500'
            }`}
          >
            <option value="Aktuelles Modell">Modell auswählen</option>
            <option value="Standard">Standard (freie Arztwahl)</option>
            <option value="HMO">HMO (Gesundheitszentrum)</option>
            <option value="Hausarzt">Hausarzt (Hausarztmodell)</option>
            <option value="Telmed">Telmed (Telemedizin)</option>
          </select>
          {validationErrors.aktuellesModell && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.aktuellesModell}</p>
          )}
        </div>

        <div className="mb-6 flex items-center space-x-2">
          <input
            type="checkbox"
            id="newToSwitzerland"
            checked={form.newToSwitzerland}
            onChange={handleChange}
            className="h-5 w-5 text-black focus:ring-black border-gray-300 rounded-xl"
          />
          <label htmlFor="newToSwitzerland" className="text-gray-700 font-bold cursor-pointer">
            Neu in der Schweiz 
          </label>
        </div>

        <button
          type="submit"
          className={`w-full font-semibold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-300 ${
            loading ? "bg-black text-white cursor-not-allowed"
            : "bg-black hover:bg-black-50 text-white focus:ring-blue-500"
          }`}
          disabled={loading}
        >
          {loading ? "Berechne..." : "Vergleich Starten"}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default PremiumCalculator;