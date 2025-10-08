import Header from "../../../components/Header";
import Footer from "../../../components/Footer";

export default function DatenschutzPage() {
  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-gray-800">
      <Header />
      <main className="flex-grow container mx-auto px-5 sm:px-10 py-14">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-semibold mb-10 text-center text-gray-900 tracking-tight">
            Datenschutzerklärung
          </h1>

          <div className="bg-gray-50 p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100 space-y-8 leading-relaxed text-[15px] sm:text-[16px] font-light">
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">1. Einleitung</h2>
              <p>
                Findbetter.ch ist ein Online-Portal für den Vergleich, Abschluss und die Kündigung von Grundversicherungen in der Schweiz. Wir verarbeiten personenbezogene Daten gemäss dem revidierten Datenschutzgesetz (nDSG) und Art. 45 VAG.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">Verantwortlicher</h2>
              <p>
                Findbetter.ch in Zusammenarbeit mit einem FINMA registrierten Broker.<br />
                E-Mail: <a href="mailto:datenschutz@findbetter.ch" className="text-blue-600 hover:underline">datenschutz@findbetter.ch</a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">2. Erfasste personenbezogene Daten</h2>
              <p>
                Postleitzahl, Geburtsjahr, Franchise, Versicherungsdetails, Kontaktinformationen sowie sensible Daten (AHV, Ausweis). Diese Informationen werden ausschliesslich für die angegebenen Zwecke verwendet.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">3. Zwecke der Verarbeitung</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Vergleich, Abschluss und Kündigung von Versicherungen</li>
                <li>Beratung und gesetzliche Pflichten</li>
                <li>Portaloptimierung und Schadenvertretung</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">4. Rechtsgrundlage</h2>
              <p>
                Vertragserfüllung, Einwilligung, gesetzliche Pflicht, berechtigtes Interesse.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">5. Weitergabe an Dritte</h2>
              <p>
                Daten werden nur an KVG-Anbieter, IT-Dienstleister oder Behörden weitergegeben. Sensible Daten werden ohne Einwilligung nicht weitergegeben.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">6. Speicherungsdauer</h2>
              <p>
                Vertragsdaten werden 10 Jahre aufbewahrt; Vergleichsdaten nur bis zum Ende der Session.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">7. Rechte der Betroffenen</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Auskunft, Berichtigung, Löschung</li>
                <li>Widerruf und Datenübertragbarkeit</li>
                <li>Einschränkung der Verarbeitung</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">8. Datensicherheit</h2>
              <p>
                Wir setzen Verschlüsselung, Zugriffskontrollen und Privacy-by-Design ein, um Ihre Daten zu schützen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">9. Cookies und Tracking</h2>
              <p>
                Wir verwenden notwendige Cookies für die Funktionalität und optionale Analyse-Cookies nur mit Ihrer Zustimmung.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">10. Änderungen</h2>
              <p>
                Diese Datenschutzerklärung ist gültig ab dem <strong>07.10.2025</strong> und wird auf findbetter.ch veröffentlicht, sobald Änderungen vorgenommen werden.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">11. Kontakt</h2>
              <p>
                Bei Fragen erreichen Sie uns unter: <a href="mailto:datenschutz@findbetter.ch" className="text-blue-600 hover:underline">datenschutz@findbetter.ch</a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}