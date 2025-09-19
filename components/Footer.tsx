const Footer = () => {
  return (
    <footer className="bg-black text-white py-12 mt-16">
      <div className="container mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-sm">
        {/* Logo */}
        <div>
          <h3 className="text-lg font-bold mb-4">Findbetter.ch</h3>
          <ul className="space-y-2">
            <li className="font-semibold">Unternehmen</li>
            <li className="hover:underline cursor-pointer">Impressum</li>
            <li className="hover:underline cursor-pointer">Über Findbetter.ch</li>
            <li className="hover:underline cursor-pointer">Unser Service</li>
            <li className="hover:underline cursor-pointer">Medien</li>
            <li className="hover:underline cursor-pointer">An/rat</li>
          </ul>
        </div>

        {/* Richtlinien */}
        <div>
          <h3 className="text-lg font-bold mb-4">Richtlinien</h3>
          <ul className="space-y-2">
            <li className="hover:underline cursor-pointer">Datenschutzbestimmungen</li>
            <li className="hover:underline cursor-pointer">Informationen nach Artikel 45</li>
            <li className="hover:underline cursor-pointer">Allgemeine Geschäftsbedingungen</li>
            <li className="hover:underline cursor-pointer">Auftrag und Vollmacht</li>
            <li className="hover:underline cursor-pointer">Vollmacht zur Kündigung</li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h3 className="text-lg font-bold mb-4">Socialmedia</h3>
          <ul className="space-y-2">
            <li className="hover:underline cursor-pointer">Instagram</li>
            <li className="hover:underline cursor-pointer">Facebook</li>
            <li className="hover:underline cursor-pointer">TikTok</li>
            <li className="hover:underline cursor-pointer">LinkedIn</li>
            <li className="hover:underline cursor-pointer">X</li>
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
