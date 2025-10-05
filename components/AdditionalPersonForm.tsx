"use client";
import React, { useState, useEffect } from "react";

const AdditionalPersonForm = ({ onResults, regionData, onRemove, personIndex }) => {
  const [form, setForm] = useState({
    geburtsjahr: "",
    franchise: "Franchise",
    unfalldeckung: "Unfalldeckung",
    aktuellesModell: "Aktuelles Modell",
    aktuelleKK: "Aktuelle KK",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const calculateAge = (birthYear) => {
    if (!birthYear) return null;
    const currentYear = new Date().getFullYear();
    return currentYear - parseInt(birthYear);
  };

  const age = calculateAge(form.geburtsjahr);

  useEffect(() => {
    if (age !== null) {
      const franchiseValue = Number(form.franchise);
      if (age < 18 && franchiseValue > 600 && franchiseValue !== NaN) {
        setForm(prev => ({ ...prev, franchise: "Franchise" }));
      } else if (age >= 18 && franchiseValue < 300 && franchiseValue !== NaN) {
        setForm(prev => ({ ...prev, franchise: "Franchise" }));
      }
    }
  }, [age]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm({ ...form, [id]: value });

    if (validationErrors[id]) {
      setValidationErrors({ ...validationErrors, [id]: "" });
    }
    if (error) {
      setError("");
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!form.geburtsjahr) {
      errors.geburtsjahr = "Geburtsjahr ist erforderlich";
    } else {
      const year = parseInt(form.geburtsjahr);
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear) {
        errors.geburtsjahr = "Bitte gültiges Geburtsjahr eingeben";
      }
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

  const handleCalculate = async () => {
    if (!validateForm()) {
      return;
    }

    if (!regionData) {
      setError("Bitte geben Sie zuerst die Postleitzahl in der Hauptformular ein");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const getTariffCode = (model) => {
        switch (model) {
          case "Telmed":
            return "TAR-DIV";
          case "HMO":
            return "TAR-HMO";
          case "Hausarzt":
            return "TAR-HAM";
          case "Standard":
            return "TAR-BASE";
          default:
            return "TAR-BASE";
        }
      };

      const requestBody = {
        insurerId: form.aktuelleKK,
        regionId: regionData?.regionId,
        birthYear: parseInt(form.geburtsjahr),
        cantonId: regionData?.cantonId,
        accidentCoverage: form.unfalldeckung === "Mit Unfalldeckung",
        franchise: form.franchise,
        tariffType: getTariffCode(form.aktuellesModell),
      };

      const response = await fetch("/api/comparison", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP Error: ${response.status}`);
      }

      const results = data.results || data || [];
      onResults(results, personIndex);
    } catch (err) {
      console.error("API Error:", err);
      setError(`Fehler beim Laden der Daten: ${err.message}`);
      onResults([], personIndex);
    } finally {
      setLoading(false);
    }
  };

  const insuranceCompanies = [
    { id: "0", name: "None" },
    { id: "1560", name: "Agrisano" },
    { id: "1507", name: "AMB Assurances SA" },
    { id: "0032", name: "Aquilana" },
    { id: "1569", name: "Arcosana (CSS)" },
    { id: "1542", name: "Assura" },
    { id: "0312", name: "Atupri" },
    { id: "0343", name: "Avenir (Groupe Mutuel)" },
    { id: "1322", name: "Birchmeier" },
    { id: "1575", name: "Compact" },
    { id: "0290", name: "Concordia" },
    { id: "0008", name: "CSS" },
    { id: "0774", name: "Easy Sana (Groupe Mutuel)" },
    { id: "0881", name: "EGK" },
    { id: "0134", name: "Einsiedler" },
    { id: "1386", name: "Galenos" },
    { id: "0780", name: "Glarner" },
    { id: "1562", name: "Helsana" },
    { id: "1142", name: "Ingenbohl" },
    { id: "1529", name: "Intras (CSS)" },
    { id: "0829", name: "KluG" },
    { id: "0762", name: "Kolping (Sympany)" },
    { id: "0376", name: "KPT" },
    { id: "0558", name: "KVF" },
    { id: "0820", name: "Lumneziana" },
    { id: "0360", name: "Luzerner Hinterland" },
    { id: "0057", name: "Moove (Sympany)" },
    { id: "1479", name: "Mutuel" },
    { id: "0455", name: "ÖKK" },
    { id: "1535", name: "Philos (Groupe Mutuel)" },
    { id: "1998", name: "Prezisa" },
    { id: "0994", name: "Progrès" },
    { id: "0182", name: "Provita" },
    { id: "1401", name: "Rhenusana" },
    { id: "1568", name: "sana24" },
    { id: "1577", name: "Sanagate (CSS)" },
    { id: "0901", name: "Sanavals" },
    { id: "1509", name: "Sanitas" },
    { id: "0923", name: "SLKK" },
    { id: "0941", name: "Sodalis" },
    { id: "0246", name: "Steffisburg" },
    { id: "1331", name: "Stoffel Mels" },
    { id: "0194", name: "Sumiswalder" },
    { id: "0062", name: "Supra" },
    { id: "1384", name: "Swica" },
    { id: "0509", name: "Sympany" },
    { id: "1113", name: "Vallée d'Entremont" },
    { id: "1555", name: "Visana" },
    { id: "1040", name: "Visperterminen" },
    { id: "0966", name: "Vita" },
    { id: "1570", name: "Vivacare" },
    { id: "1318", name: "Wädenswil" },
  ];

  const getFranchiseOptions = () => {
    if (age === null) {
      return [
        { value: "0", label: "CHF 0" },
        { value: "100", label: "CHF 100" },
        { value: "200", label: "CHF 200" },
        { value: "300", label: "CHF 300" },
        { value: "400", label: "CHF 400" },
        { value: "500", label: "CHF 500" },
        { value: "600", label: "CHF 600" },
      ];
    }

    if (age < 18) {
      return [
        { value: "0", label: "CHF 0" },
        { value: "100", label: "CHF 100" },
        { value: "200", label: "CHF 200" },
        { value: "300", label: "CHF 300" },
        { value: "400", label: "CHF 400" },
        { value: "500", label: "CHF 500" },
        { value: "600", label: "CHF 600" },
      ];
    } else {
      return [
        { value: "300", label: "CHF 300" },
        { value: "500", label: "CHF 500" },
        { value: "1000", label: "CHF 1'000" },
        { value: "1500", label: "CHF 1'500" },
        { value: "2000", label: "CHF 2'000" },
        { value: "2500", label: "CHF 2'500" },
      ];
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] w-full max-w-sm flex-shrink-0 border-2 border-blue-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          Weitere Person {personIndex + 1}
        </h2>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 font-medium text-sm"
        >
          Entfernen
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor={`geburtsjahr-${personIndex}`}
            className="block text-sm font-medium text-gray-500 mb-2"
          >
            Geburtsjahr *
          </label>
          <input
            type="number"
            id="geburtsjahr"
            value={form.geburtsjahr}
            onChange={handleChange}
            placeholder="z.B. 1990"
            min="1900"
            max={new Date().getFullYear()}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition ${
              validationErrors.geburtsjahr
                ? "border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500"
                : "border-gray-200 bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
            }`}
          />
          {validationErrors.geburtsjahr && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.geburtsjahr}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`franchise-${personIndex}`}
            className="block text-sm font-medium text-gray-500 mb-2"
          >
            Franchise *
          </label>
          <select
            id="franchise"
            value={form.franchise}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition ${
              validationErrors.franchise
                ? "border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500"
                : "border-gray-200 bg-gray-50 text-gray-500 focus:ring-blue-500 focus:border-blue-500"
            }`}
          >
            <option value="Franchise">Franchise auswählen</option>
            {getFranchiseOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {validationErrors.franchise && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.franchise}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`unfalldeckung-${personIndex}`}
            className="block text-sm font-medium text-gray-500 mb-2"
          >
            Unfall *
          </label>
          <select
            id="unfalldeckung"
            value={form.unfalldeckung}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition ${
              validationErrors.unfalldeckung
                ? "border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500"
                : "border-gray-200 bg-gray-50 text-gray-500 focus:ring-blue-500 focus:border-blue-500"
            }`}
          >
            <option value="Unfalldeckung">Unfalldeckung auswählen</option>
            <option value="Mit Unfalldeckung">Mit Unfalldeckung</option>
            <option value="Ohne Unfalldeckung">Ohne Unfalldeckung</option>
          </select>
          {validationErrors.unfalldeckung && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.unfalldeckung}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`aktuelleKK-${personIndex}`}
            className="block text-sm font-medium text-gray-500 mb-2"
          >
            Aktuelle KVG *
          </label>
          <select
            id="aktuelleKK"
            value={form.aktuelleKK}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition ${
              validationErrors.aktuelleKK
                ? "border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500"
                : "border-gray-200 bg-gray-50 text-gray-500 focus:ring-blue-500 focus:border-blue-500"
            }`}
          >
            {insuranceCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          {validationErrors.aktuelleKK && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.aktuelleKK}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`aktuellesModell-${personIndex}`}
            className="block text-sm font-medium text-gray-500 mb-2"
          >
            Arzt Modell *
          </label>
          <select
            id="aktuellesModell"
            value={form.aktuellesModell}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition ${
              validationErrors.aktuellesModell
                ? "border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500"
                : "border-gray-200 bg-gray-50 text-gray-500 focus:ring-blue-500 focus:border-blue-500"
            }`}
          >
            <option value="Aktuelles Modell">Modell auswählen</option>
            <option value="Standard">Standard (freie Arztwahl)</option>
            <option value="HMO">HMO (Gesundheitszentrum)</option>
            <option value="Hausarzt">Hausarzt (Hausarztmodell)</option>
            <option value="Telmed">Telmed (Telemedizin)</option>
          </select>
          {validationErrors.aktuellesModell && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.aktuellesModell}
            </p>
          )}
        </div>

        <button
          onClick={handleCalculate}
          className={`w-full font-semibold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-300 ${
            loading
              ? "bg-black text-white cursor-not-allowed"
              : "bg-black hover:bg-gray-800 text-white focus:ring-blue-500"
          }`}
          disabled={loading}
        >
          {loading ? "Berechne..." : "Berechnen"}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdditionalPersonForm;