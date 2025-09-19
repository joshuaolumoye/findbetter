const Header = () => {
  return (
    <header className="bg-black border-b border-gray-200 sticky top-0 z-10">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="font-extrabold text-xl text-white tracking-tight">FindBetter.ch</div>
        <div className="flex items-center space-x-4">
          {/* Button with image + text */}
          <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-tl-lg rounded-br-lg text-xs font-light hover:bg-gray-200 transition tracking-wider">
            <img src="../heart.svg" alt="icon" className="w-5 h-4" />
            <span>KRANKENKASSENRECHNER</span>
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Header;
