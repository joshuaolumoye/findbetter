import Header from "../../../components/Header";
import Footer from "../../../components/Footer";

export default function DatenschutzPage() {
  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-gray-800">
      <Header />
      <main className="flex-grow container mx-auto px-5 sm:px-10 py-14">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-semibold mb-10 text-center text-gray-900 tracking-tight">
            Datenschutzerklärung für Findbetter.ch
          </h1>

          <div className="bg-gray-50 p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100 space-y-8 leading-relaxed text-[15px] sm:text-[16px] font-light">
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">1. Einleitung</h2>
              <p>
                Findbetter.ch ist ein Online-Portal für den Vergleich, Abschluss und die Kündigung von Grundversicherungen (KVG) in der Schweiz. In Zusammenarbeit mit einem FINMA registrierten Broker. Wir verarbeiten personenbezogene Daten als Verantwortlicher im Sinne des revidierten schweizerischen Datenschutzgesetzes (nDSG, in Kraft seit 1. September 2023) und erfüllen die Informationspflichten nach Art. 45 VAG. Diese Erklärung beschreibt die Datenverarbeitung bei Eingabe, Vergleich, Abschluss (via Skribble) und Nachverarbeitung.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">Verantwortlicher</h2>
              <p>
                Findbetter.ch (in Zusammenarbeit mit einem FINMA Registrierten Broker, E-Mail:{" "}
                <a href="mailto:datenschutz@findbetter.ch" className="text-blue-600 hover:underline">
                  datenschutz@findbetter.ch
                </a>
                . Für Art. 45 VAG-Informationen siehe Offenlegungen der Partner.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">2. Erfasste personenbezogene Daten</h2>
              <p>Wir erheben nur zweckgebundene Daten gemäss nDSG-Prinzipien:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Vergleichsphase:</strong> Postleitzahl, Geburtsjahr, aktuelle Franchise, Unfalldeckungswunsch, aktuelle Grundversicherung, Ärzte-Modell.
                </li>
                <li>
                  <strong>Abschlussphase (Pop-up):</strong> Anrede, Vor-/Nachname, Geburtsdatum, Telefonnummer, E-Mail, Wohnadresse, aktuelle Krankenversicherung, Policennummer, gewünschter Versicherungsbeginn, Staatsangehörigkeit.
                </li>
                <li>
                  <strong>Sensible Daten:</strong> AHV-Nummer, Ausweiskopie (biometrische Daten), indirekte Gesundheitsdaten (z. B. aus Versicherungsdetails).
                </li>
                <li>
                  <strong>Technische Daten:</strong> IP-Adresse, Browser-Informationen, Cookies.
                </li>
              </ul>
              <p>Datenquellen: Direkt von Ihnen (Formulare, Uploads), Dritten (z. B. Versicherer bei Kündigung).</p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">3. Zwecke der Datenverarbeitung</h2>
              <p>Die Verarbeitung dient:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Vergleich und personalisierte KVG-Angebote.</li>
                <li>Abschluss, Kündigung und interne Abwicklung (via Skribble).</li>
                <li>Optionaler Beratung bei Interesse.</li>
                <li>Gesetzliche Pflichten (z. B. Identitätsprüfung, FINMA-Dokumentation).</li>
                <li>Portaloptimierung durch anonymisierte Analysen.</li>
                <li>Schadenvertretung (Einsicht in Dossiers).</li>
              </ul>
              <p>Sensible Daten werden nur für Identifikation und Vertragsabwicklung genutzt.</p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">4. Rechtsgrundlage</h2>
              <p>Basierend auf nDSG und VAG:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Vertragserfüllung</strong> (Art. 31 nDSG): Für Vergleich, Abschluss, Kündigung.
                </li>
                <li>
                  <strong>Einwilligung</strong> (Art. 31 nDSG, für sensible Daten): Durch Akzeptanz (z. B. AGB, Brokermandat, Vollmacht) und Signatur. Widerruf möglich.
                </li>
                <li>
                  <strong>Gesetzliche Pflicht</strong> (Art. 31 nDSG): Z. B. FINMA-Registrierung, AML-Prüfungen.
                </li>
                <li>
                  <strong>Berechtigtes Interesse</strong> (Art. 31 nDSG): Sicherheit, Betrugsprävention.
                </li>
              </ul>
              <p>Sensible Daten erfordern ausdrückliche Einwilligung.</p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">5. Weitergabe an Dritte und Übermittlung ins Ausland</h2>
              <p>Daten werden weitergegeben:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>An KVG-Anbieter für Abschluss/Kündigung.</li>
                <li>An Dienstleister (z. B. Skribble, IT-Partner als Auftragsverarbeiter).</li>
                <li>An Behörden (z. B. FINMA bei Meldepflichten).</li>
              </ul>
              <p>
                Keine Weitergabe sensibler Daten ohne Einwilligung. Übermittlungen ins Ausland (z. B. EU) mit angemessenem Schutzniveau (z. B. Standardvertragsklauseln).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">6. Speicherungsdauer</h2>
              <p>Daten werden nur so lange aufbewahrt, wie nötig:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Vergleichsdaten: Bis Session-Ende oder Löschung.</li>
                <li>Vertragsdaten: Mindestens 10 Jahre (VAG/OR-Pflichten).</li>
                <li>Sensible Daten (z. B. Ausweiskopie): Temporär für Verifizierung, dann gelöscht.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">7. Ihre Rechte als Betroffener</h2>
              <p>Gemäss nDSG:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Auskunft, Berichtigung, Löschung, Einschränkung.</li>
                <li>Widerspruch (z. B. gegen berechtigtes Interesse).</li>
                <li>Widerruf der Einwilligung.</li>
                <li>Datenübertragbarkeit.</li>
                <li>Überprüfung automatisierter Entscheidungen.</li>
              </ul>
              <p>
                Anfragen an{" "}
                <a href="mailto:datenschutz@findbetter.ch" className="text-blue-600 hover:underline">
                  datenschutz@findbetter.ch
                </a>{" "}
                mit Identitätsnachweis. Beschwerden an EDÖB.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">8. Datensicherheit</h2>
              <p>Technische/organisatorische Massnahmen (z. B. Verschlüsselung, Zugriffssteuerung) schützen vor Missbrauch. Privacy-by-Design/Default.</p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">9. Cookies und Tracking</h2>
              <p>Notwendige Cookies für Funktionalität; optionale für Analyse (Einwilligung erforderlich). Ablehnung über Browser-Einstellungen.</p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">10. Änderungen</h2>
              <p>Änderungen werden auf findbetter.ch veröffentlicht; aktuelle Version: 07.10.2025.</p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">11. Kontakt</h2>
              <p>
                Fragen:{" "}
                <a href="mailto:datenschutz@findbetter.ch" className="text-blue-600 hover:underline">
                  datenschutz@findbetter.ch
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
