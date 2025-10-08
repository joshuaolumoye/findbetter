import Header from "../../../components/Header";
import Footer from "../../../components/Footer";

export default function ImpressumPage() {
  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-gray-800">
      <Header />
      <main className="flex-grow container mx-auto px-5 sm:px-10 py-14">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-semibold mb-10 text-center text-gray-900 tracking-tight">
            Impressum
          </h1>

          <div className="bg-gray-50 p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100 space-y-8 leading-relaxed text-[15px] sm:text-[16px] font-light">
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">Verantwortlich für den Betrieb der Website</h2>
              <p>
                Findbetter.ch AG<br />
                in Zusammenarbeit mit 360 Finance GmbH<br />
                Bahnhofstrasse 100<br />
                8001 Zürich, Schweiz
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">Vertretungsberechtigte Person</h2>
              <p>
                [Name des Geschäftsführers/der Geschäftsführerin, z. B. Rexhepi Astrit, falls bekannt]<br />
                360 Finance GmbH (FINMA Nr. F01308862)
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">Kontaktdaten</h2>
              <p>
                E-Mail: <a href="mailto:info@findbetter.ch" className="text-blue-600 hover:underline">info@findbetter.ch</a><br />
                Telefon: [Telefonnummer einfügen]
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">Registereintrag</h2>
              <p>
                Rechtsform: Gesellschaft mit beschränkter Haftung (GmbH)<br />
                Handelsregistereintrag: CHE-226.590.739<br />
                Zuständiges Registergericht: Handelsregisteramt Zürich
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">Aufsicht und Zulassung</h2>
              <p>
                360 Finance GmbH ist als ungebundener Versicherungsvermittler gemäss Art. 40 Abs. 2 des VAG zugelassen und im Register der FINMA unter der Nummer <strong>F01308862</strong> eingetragen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">Verantwortlich für den Inhalt</h2>
              <p>
                Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für Richtigkeit, Vollständigkeit und Aktualität übernehmen wir keine Gewähr.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">Haftungsausschluss</h2>
              <p>
                Die Haftung der 360 Finance GmbH beschränkt sich auf grobfahrlässige oder vorsätzliche Schäden gemäss AGB.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">Datenschutz</h2>
              <p>
                Die Verarbeitung personenbezogener Daten erfolgt gemäss unserer <a href="/datenschutz" className="text-blue-600 hover:underline">Datenschutzerklärung</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-3">Streitbeilegung</h2>
              <p>
                Für Streitigkeiten gilt schweizerisches Recht. Gerichtsstand ist Zürich.
              </p>
            </section>

            <section>
              <p><strong>Stand:</strong> 07. Oktober 2025</p>
              <p className="italic text-gray-500 mt-2">
                Diese Informationen entsprechen den Anforderungen der FINMA und dem schweizerischen Recht.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}