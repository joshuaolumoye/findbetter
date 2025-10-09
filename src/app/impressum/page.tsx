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
              <p><strong>Verantwortlich für den Betrieb der Website:</strong><br />
                Findbetter.ch AG<br />
                in Zusammenarbeit mit 360 Finance GmbH<br />
                Bahnhofstrasse 100<br />
                8001 Zürich<br />
                Schweiz
              </p>
            </section>

            <section>
              <p><strong>Vertretungsberechtigte Person:</strong><br />
                Rexhepi Astrit<br />
                360 Finance GmbH (FINMA Nr. F01308862)
              </p>
            </section>

            <section>
              <p><strong>Kontaktdaten:</strong><br />
                E-Mail: <a href="mailto:info@findbetter.ch" className="text-blue-600 hover:underline">info@findbetter.ch</a>
              </p>
            </section>

            <section>
              <p><strong>Registereintrag:</strong><br />
                - Rechtsform: Gesellschaft mit beschränkter Haftung (GmbH)<br />
                - Handelsregistereintrag: CHE-226.590.739<br />
                - Zuständiges Registergericht: Handelsregisteramt Zürich
              </p>
            </section>

            <section>
              <p><strong>Aufsicht und Zulassung:</strong><br />
                360 Finance GmbH ist als ungebundener Versicherungsvermittler gemäss Art. 40 Abs. 2 des Versicherungsaufsichtsgesetzes (VAG) zugelassen und im Register der Eidgenössischen Finanzmarktaufsicht (FINMA) unter der Nummer F01308862 eingetragen. Tätigkeitsbereiche: Lebensversicherung, Schadensversicherung.
              </p>
            </section>

            <section>
              <p><strong>Verantwortlich für den Inhalt:</strong><br />
                Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Informationen übernehmen wir jedoch keine Gewähr.
              </p>
            </section>

            <section>
              <p><strong>Haftungsausschluss:</strong><br />
                Die Haftung der 360 Finance GmbH als Beauftragte von Findbetter.ch beschränkt sich auf grobfahrlässige oder vorsätzliche Schäden gemäss den allgemeinen Geschäftsbedingungen (AGB). Für leichtfahrlässig verursachte Schäden wird keine Haftung übernommen, soweit gesetzlich zulässig. Weitere Details zur Haftung finden sich im Brokermandat.
              </p>
            </section>

            <section>
              <p><strong>Datenschutz:</strong><br />
                Die Verarbeitung personenbezogener Daten erfolgt gemäss der Datenschutzerklärung von Findbetter.ch, die auf dieser Website einsehbar ist. Verantwortlicher für die Datenverarbeitung ist die Findbetter.ch AG in Zusammenarbeit mit der 360 Finance GmbH.
              </p>
            </section>

            <section>
              <p><strong>Streitbeilegung:</strong><br />
                Für Streitigkeiten gilt schweizerisches Recht, mit Gerichtsstand Zürich. Verbraucher haben die Möglichkeit, Beschwerden an die Eidgenössische Datenschutz- und Öffentlichkeitsbeauftragte (EDÖB) zu richten.
              </p>
            </section>

            <section>
              <p><strong>Änderungen des Impressums:</strong><br />
                Wir behalten uns vor, dieses Impressum jederzeit zu ändern. Die aktuelle Version ist auf der Website einsehbar. Änderungen gelten als angenommen, wenn kein Widerspruch innerhalb von 30 Tagen nach Bekanntgabe in Textform eingelegt wird.<br />
                <strong>Stand:</strong> 07. Oktober 2025
              </p>
            </section>

            <section>
              <p><strong>Hinweis:</strong><br />
                Diese Informationen entsprechen den Anforderungen der FINMA und dem schweizerischen Recht. Für rechtliche Details (z. B. Haftungsgrenzen) beachten Sie die AGB und das Brokermandat, die auf Anfrage bereitgestellt werden.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
