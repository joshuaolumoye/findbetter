"use client";
import React, { useState } from "react";

const faqData = [
  {
    question: "Wie Funktioniert Findbetter.ch",
    answer:
      "Auf Findbetter.ch geben Sie einmalig Ihre persönlichen Daten und Präferenzen ein. Anschliessend vergleichen Sie die verfügbaren KVG-Grundversicherungen und wählen das passende (z. B. das günstigste) Modell aus. Sie prüfen die Offerte in Ruhe und bestätigen sie online. Danach übernehmen wir für Sie die Formalitäten: Mit Ihrer Einwilligung und einer Datenschutz-konformen Vollmacht kündigen wir Ihre bisherige Grundversicherung automatisch – standardmässig auf den 31.12. des laufenden Jahres. Nach erfolgreicher Kündigung erhalten Sie eine Bestätigung sowie eine Kopie der gekündigten Grundversicherung. So wechseln Sie sicher, bequem und vollständig digital."
  },
  {
    question: "Wie wird meine KVG Automatisiert gekündigt?",
    answer:
      "Sobald Sie Ihre bisherigen Versicherungsdaten erfasst und die neue Police bestätigt haben, erteilen Sie uns digital die Vollmacht. Unser System generiert daraufhin automatisch Ihre Kündigung mit allen erforderlichen Angaben (u. a. Policenummer, Termin 31.12.des laufenden Jahres.) und übermittelt sie an Ihre aktuelle Krankenkasse. Für zusätzliche Sicherheit lassen wir das Schreiben zudem physisch stempeln. Geht die Kündigungsbestätigung der Kasse ein, leiten wir sie umgehend an Sie weiter; zugleich finden Sie Kündigung und Bestätigung in Ihrem Konto zum Herunterladen. Wir überwachen den Wechselprozess, damit Ihre neue Grundversicherung nahtlos in Kraft tritt – datenschutzkonform und ohne Mehraufwand für Sie."
  },
  {
    question: "Wie Funktioniert der Übergang zur neuen KVG?",
    answer:
      "Sobald Sie die neue KVG-Grundversicherung bestätigt haben, übermitteln wir Ihre Antragsdaten digital an die gewählte Versicherung und leiten parallel die Kündigung an Ihre bisherige Kasse weiter. Alle Schritte laufen automatisiert und datenschutzkonform. Für zusätzliche Beweissicherheit lassen wir die Kündigung zudem physisch stempeln. So stellen wir sicher, dass Ihre bisherige Grundversicherung per 31.12. endet und die neue in der Regel am 01.01. nahtlos startet – ohne Lücken im Schutz. Den Status sowie alle Dokumente (Antrag, Kündigung, Bestätigung) erhalten Sie per E-Mail und können sie jederzeit einsehen."
  },
  {
    question: "Was sind meine Vorteile?",
    answer:
      "Der klassische Weg vom ersten Anruf bis zur Kündigung dauert schnell 2,5 Stunden. Findbetter.ch reduziert das auf rund 5 Minuten: Daten eingeben, Angebote vergleichen, Offerte bestätigen – den Rest (inkl. fristgerechter Kündigung per 31.12. mit Ihrer Vollmacht) übernehmen wir. Weil die KVG-Leistungen gesetzlich identisch sind, zählt vor allem der Preis und das passende Modell. Für maximale Nachvollziehbarkeit nutzt unser Rechner dieselbe offizielle Datengrundlage wie priminfo.admin.ch – damit ist Ihre Entscheidung 100 % transparent. Alles läuft papierlos und ressourcenschonend; Bestätigungen erhalten Sie per E-Mail und können Unterlagen jederzeit einsehen."
  },
  {
    question: "Was kostet mich der Vergleich?",
    answer:
      "Unser Service kostet Sie nichts: Sie können beliebig viele Vergleiche durchführen – auch für Partner, Kinder oder weitere Personen. Die Erstellung der Offerte, der digitale Abschluss sowie unser Kündigungsservice per 31.12. sind für Sie ebenfalls kostenlos. Es besteht keine Abschlussverpflichtung: Sie testen, vergleichen und entscheiden in Ruhe. Zusätzliche Gebühren von Findbetter.ch fallen nicht an; Sie zahlen einzig die regulären Prämien Ihrer gewählten Krankenkasse. Alle Bestätigungen erhalten Sie per E-Mail und können die Unterlagen jederzeit herunterladen."
  },
  {
    question: "Was Passiert mit meinen Daten?",
    answer:
      "Ihre Daten dienen drei Zwecken: (1) Durchführung des Vergleichs und eines möglichen Abschlusses, (2) Verbesserung von Findbetter.ch (z. B. Usability, Servicequalität) und (3) – nur mit Ihrer Einwilligung – anonymisierte/aggregierte Marketing-Analysen sowie Kontaktaufnahme. Für Offerten/Abschlüsse übermitteln wir die erforderlichen Angaben an die von Ihnen gewählte Versicherung. Eine Weitergabe oder ein Verkauf an sonstige Dritte erfolgt nicht. Übertragung und Speicherung erfolgen verschlüsselt (TLS); Zugriffe sind rollenbasiert und auf das Notwendige beschränkt. Sie können Einwilligungen jederzeit widerrufen sowie Auskunft, Berichtigung oder Löschung verlangen. Wir speichern nur so lange, wie es für den Zweck bzw. gesetzliche Pflichten erforderlich ist."
  },
  {
    question: "Was sind die Unterschiede zwischen den KVG’S?",
    answer:
      "In der Grundversicherung (OKP) sind die Leistungen bundesrechtlich festgelegt – deshalb erhalten Sie bei allen Kassen den gleichen medizinischen Basis-Schutz. Die Unterschiede betreffen primär Prämien sowie die Betreuungsstruktur des gewählten Modells:\n* Standard (freie Arztwahl)\n* Hausarztmodell (erster Kontakt Hausarzt)\n* HMO/Gruppenpraxis (Behandlung über Gesundheitszentrum)\n* Telmed (telemedizinische Erstberatung)\nEinige Kassen bieten Kombi-/Flex-Varianten, die mehrere Wege kombinieren; sogenannte Apotheken-Modelle werden häufig als Variante von Hausarzt/Telmed geführt. Detaillierte Erläuterungen zu Leistungen und Modellen stellt das BAG/Priminfo bereit."
  },
  {
    question: "Welche Personen können Findbetter.ch Nutzen?",
    answer:
      "Findbetter.ch können alle Personen mit Wohnsitz in der Schweiz nutzen – unabhängig von Nationalität oder Gesundheitszustand. Die KVG-Grundversicherung ist obligatorisch: Wer sich in der Schweiz niederlässt (oder ein Kind bekommt), muss innerhalb von 3 Monaten eine Grundversicherung abschliessen. Für Neuzuziehende gilt: Schliessen Sie rechtzeitig ab, gilt der Versicherungsschutz rückwirkend ab Wohnsitznahme; die Prämien sind dann ebenfalls rückwirkend geschuldet. Kinder werden immer separat versichert (es gibt keine Familienpolicen). Mit Findbetter.ch erledigen Sie das schnell, transparent und rechtskonform – inklusive Unterstützung bei Sonderfällen, damit Sie die Fristen sicher einhalten."
  },
  {
    question: "Weshalb muss ich eine Vollmacht unterzeichnen?",
    answer:
      "Ohne Ihre Vollmacht darf Findbetter.ch Ihre bisherige Grundversicherung nicht in Ihrem Namen kündigen oder Auskünfte einholen. Mit der Vollmacht ermächtigen Sie uns, den Wechsel rechtswirksam, fristgerecht und datenschutzkonform für Sie abzuwickeln. Krankenkassen akzeptieren Kündigungen und Auskünfte in der Regel nur direkt von der versicherten Person – oder von jemandem, der schriftlich bevollmächtigt ist. Damit wir Ihre KVG-Grundversicherung per 31.12. kündigen, notwendige Angaben (z. B. Policenummer, Kündigungsbestätigung) bei der bisherigen Kasse einholen und den Abschluss bei der neuen Kasse korrekt übermitteln können, benötigen wir Ihre Vollmacht. Der Umfang ist zweckgebunden: Sie gilt ausschliesslich für den Wechsel Ihrer KVG-Grundversicherung und nur für die dafür nötigen Schritte. Sie ist widerrufbar und endet automatisch, sobald der Wechsel abgeschlossen ist. Ihre Daten werden verschlüsselt übertragen, nur für diesen Prozess genutzt und nicht an Dritte weitergegeben – ausser an die von Ihnen gewählte Versicherung, wo es für Offerte/Vertrag erforderlich ist."
  }
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="max-w-2xl mx-auto px-4 py-12">
      <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-8 text-gray-900">
        FAQ
      </h2>
      <div className="space-y-4">
        {faqData.map((item, index) => (
          <div
            key={index}
            className={`shadow-md overflow-hidden transition-all duration-200 ${
              openIndex === index
                ? "rounded-none" // no rounding when open
                : "rounded-r-full rounded-tl-full hover:rounded-r-xl hover:rounded-tl-xl"
            }`}
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full flex justify-between items-center px-5 py-3 text-left text-sm sm:text-base font-medium text-gray-800 bg-gray-50 hover:bg-gray-100 transition-all duration-200"
            >
              {item.question}
            </button>
            {openIndex === index && (
              <div className="px-5 py-4 text-sm sm:text-base text-gray-700 bg-gray-50 border-t border-gray-200 whitespace-pre-line leading-relaxed">
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

