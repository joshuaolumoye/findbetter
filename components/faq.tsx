"use client";
import React, { useState } from "react";

const faqData = [
  { question: "Wie Funktioniert Findbetter.ch ?", answer: "Findbetter.ch funktioniert, indem ..." },
  { question: "Wie wird meine KVG automatisiert gekündigt ?", answer: "Deine KVG wird durch unser System ..." },
  { question: "Wie Funktioniert der Übergang zur neuen KVG?", answer: "Der Übergang erfolgt durch ..." },
  { question: "Was sind meine Vorteile ?", answer: "Deine Vorteile sind ..." },
  { question: "Was kostet mich der Vergleich ?", answer: "Der Vergleich ist kostenlos ..." },
  { question: "Was passiert mit meinen Daten ?", answer: "Deine Daten bleiben geschützt ..." },
  { question: "Was sind die Unterschiede zwischen den KVG’s ?", answer: "Die Unterschiede sind ..." },
  { question: "Welche Personen können Findbetter.ch nutzen ?", answer: "Alle Personen in der Schweiz ..." },
  { question: "Weshalb muss ich eine Vollmacht unterzeichnen ?", answer: "Die Vollmacht ist notwendig, um ..." }
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="max-w-2xl mx-auto px-4 py-12">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">FAQ</h2>
      <div className="space-y-4">
        {faqData.map((item, index) => (
          <div key={index} className="rounded-r-full rounded-tl-full shadow-md overflow-hidden">
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full flex justify-between items-center px-4 py-3 text-left text-sm sm:text-base font-medium text-gray-800 bg-gray-100 hover:bg-gray-50 transition"
            >
              {item.question}
              {/* <span className="ml-2 text-lg">{openIndex === index ? "−" : "+"}</span> */}
            </button>
            {openIndex === index && (
              <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 border-t">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQ;
