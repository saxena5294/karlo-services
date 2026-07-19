import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const navigationLinks = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "Track Application", path: "/track" },
  { name: "About", path: "/about" },
  { name: "FAQs", path: "/faq" },
  { name: "Contact", path: "/contact" },
];

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const getNavLinkClass = ({ isActive }) =>
    isActive
      ? "font-semibold text-blue-700"
      : "font-medium text-slate-600 transition hover:text-blue-700";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between sm:h-18">
          <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 font-bold text-white sm:h-10 sm:w-10">
              K
            </div>

            <div>
              <p className="text-lg font-bold leading-none text-blue-700 sm:text-xl">
                Karlo
              </p>
              <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                Digital Services
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {navigationLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={getNavLinkClass}
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white transition hover:bg-blue-800"
            >
              Register
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((previous) => !previous)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-2xl text-slate-700 sm:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? "×" : "☰"}
          </button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-slate-200 py-4 sm:hidden">
            <div className="flex flex-col gap-1">
              {navigationLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-3 ${
                      isActive
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "font-medium text-slate-600 hover:bg-slate-50"
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
              <Link
                to="/login"
                onClick={closeMenu}
                className="rounded-lg border border-blue-700 px-4 py-2.5 text-center font-semibold text-blue-700"
              >
                Login
              </Link>

              <Link
                to="/register"
                onClick={closeMenu}
                className="rounded-lg bg-blue-700 px-4 py-2.5 text-center font-semibold text-white"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
