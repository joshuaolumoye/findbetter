import Header from "../../../components/Header";
import Footer from "../../../components/Footer";

export default function UeberFindbetterPage() {
  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-gray-800">
      <Header />
      <main className="flex-grow container mx-auto px-5 sm:px-10 py-14">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-semibold mb-10 text-center text-gray-900 tracking-tight">
            Über Findbetter.ch
          </h1>

          <div className="bg-gray-50 p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100 space-y-8 leading-relaxed text-[15px] sm:text-[16px] font-light">
            <section>
              <p>
                Stellen Sie sich vor: Ein Prozess, der normalerweise Stunden oder sogar Tage dauert, wird zu einer nahtlosen, stressfreien Erfahrung – genau das verspricht Ihnen <strong>Findbetter.ch</strong>.
              </p>
            </section>

            <section>
              <p>
                Als das erste Online-Portal in der Schweiz, das den Vergleich, den direkten Abschluss und die Kündigung von Grundversicherungen ermöglicht, sind wir hier, um Ihr Vertrauen zu gewinnen und Ihre Erwartungen zu übertreffen.
              </p>
            </section>

            <section>
              <p>
                Wussten Sie, dass alle gesetzlich vorgeschriebenen Grundversicherungen in der Schweiz dieselben Leistungen bieten? Das bedeutet, Ihre Entscheidung hängt letztlich nur vom Preis ab – und genau hier liegt unsere Stärke.
              </p>
            </section>

            <section>
              <p>
                Wir haben erkannt, dass andere Vergleichsportale oft nur eine begrenzte Auswahl bieten. Bei <strong>Findbetter.ch</strong> ändern wir das: Jeder soll die Möglichkeit haben, den perfekten Tarif zu entdecken, der zu Budget und Lebensstil passt.
              </p>
            </section>

            <section>
              <p>
                Unsere Reise begann mit der Vision, Komplexität in Einfachheit zu verwandeln. Von der Dateneingabe bis zur digitalen Unterzeichnung optimieren wir jeden Schritt für Sie – mit moderner Technologie, transparenter Kommunikation und höchster Sicherheit.
              </p>
            </section>

            <section>
              <p>
                Vertrauen Sie auf <strong>Findbetter.ch</strong>, und erleben Sie, wie einfach Versicherungen sein können – für mehr Klarheit, Sicherheit und persönlichen Nutzen.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
