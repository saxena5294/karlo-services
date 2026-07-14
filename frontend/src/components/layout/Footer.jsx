import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">
              K
            </div>

            <p className="text-xl font-bold text-white">Karlo</p>
          </div>

          <p className="mt-4 leading-7 text-slate-400">
            Your trusted platform for government, financial and digital
            services.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-white">Quick links</h3>

          <div className="mt-4 flex flex-col gap-3">
            <Link to="/" className="hover:text-white">
              Home
            </Link>

            <Link to="/services" className="hover:text-white">
              Services
            </Link>

            <Link to="/track" className="hover:text-white">
              Track Application
            </Link>

            <Link to="/about" className="hover:text-white">
              About Us
            </Link>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-white">Services</h3>

          <div className="mt-4 flex flex-col gap-3 text-slate-400">
            <span>PAN Card</span>
            <span>Passport</span>
            <span>Certificates</span>
            <span>GST and ITR</span>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-white">Contact</h3>

          <div className="mt-4 space-y-3 text-slate-400">
            <p>support@karlo.in</p>
            <p>+91 98765 43210</p>
            <p>Monday–Saturday, 9 AM–7 PM</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 py-5 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Karlo Services. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;