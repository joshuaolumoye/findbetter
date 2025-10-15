import Link from "next/link";
const Footer = () => {
  return (
    <footer className="bg-black text-white py-12 mt-16">
      <div className="container mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-sm">
        {/* Logo */}
        <div>
          <h3 className="text-lg font-bold mb-4">Findbetter.ch</h3>
          <ul className="space-y-2">
            <li className="font-semibold">Unternehmen</li>
            <li><Link href="/impressum" className="hover:underline">Impressum</Link></li>
            <li><Link href="/ueber-findbetter" className="hover:underline">Über Findbetter.ch</Link></li>
            {/* <li className="hover:underline cursor-pointer">Unser Service</li>
            <li className="hover:underline cursor-pointer">Medien</li> */}
          </ul>
        </div>

        {/* Richtlinien */}
        <div>
          <h3 className="text-lg font-bold mb-4">Richtlinien</h3>
          <ul className="space-y-2">
            <li><Link href="/datenschutz" className="hover:underline">Datenschutzbestimmungen</Link></li>
            <li className="hover:underline cursor-pointer">
              <a target="_blank" rel="noopener noreferrer" href="/documents/Informationen_nach_Artikel.pdf">
                Informationen nach Artikel 45
              </a>
            </li>
            <li className="hover:underline cursor-pointer"></li>
            {/* <li className="hover:underline cursor-pointer">
              <a target="_blank" rel="noopener noreferrer" href="/documents/Allgemeine_geschaftsbedingungen.pdf">
                Allgemeine Geschäftsbedingungen
              </a>
            </li>
            <li className="hover:underline cursor-pointer"></li> */}
            <li className="hover:underline cursor-pointer">
              <a target="_blank" rel="noopener noreferrer" href="/documents/Muster_Brokermandat_DE_Vollmandat.pdf">
                Auftrag und Vollmacht
              </a>
            </li>
            <li className="hover:underline cursor-pointer">
              <a target="_blank" rel="noopener noreferrer" href="/documents/Vollmacht_zur_Kundigung.pdf">
                Vollmacht zur Kündigung
              </a>
            </li>
            <li className="hover:underline cursor-pointer"></li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h3 className="text-lg font-bold mb-4">Socialmedia</h3>
          <ul className="space-y-2">
            <li className="hover:underline cursor-pointer"> <a target="_blank" href="https://www.instagram.com/findbetter.ch/?utm_source=ig_web_button_share_sheet">Instagram</a> </li>
            <li className="hover:underline cursor-pointer"><a target="_blank" href="https://www.facebook.com/share/1CacPXGGk4/?mibextid=wwXIfr">Facebook </a></li>
            <li className="hover:underline cursor-pointer"><a target="_blank" href="https://www.tiktok.com/@findbetter.ch?lang=de-DE">TikTok</a></li>
            <li className="hover:underline cursor-pointer"><a target="_blank" href="https://www.linkedin.com/company/findbetter-ch/about/?viewAsMember=true">LinkedIn </a></li>
            <li className="hover:underline cursor-pointer"><a target="_blank" href="https://x.com/Findbetter_ch">X</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-12 text-center text-xs text-gray-400">
        <p>Copyright © 2025 Findbetter.ch</p>
      </div>
    </footer>
  );
};

export default Footer;
