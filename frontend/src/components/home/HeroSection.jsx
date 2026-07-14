import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-24">
        <div className="text-center lg:text-left">
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:px-4 sm:py-2 sm:text-sm">
            Trusted digital service platform
          </span>

          <h1 className="mt-5 text-3xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Government and digital services,
            <span className="text-blue-700"> made simple.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 lg:mx-0">
            Apply for PAN card, passport, certificates, GST, ITR and other
            services from one secure platform.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              to="/services"
              className="rounded-xl bg-blue-700 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-800"
            >
              Explore Services
            </Link>

            <Link
              to="/track"
              className="rounded-xl border border-blue-700 px-6 py-3 text-center font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Track Application
            </Link>
          </div>

          <div className="mx-auto mt-9 grid max-w-lg grid-cols-3 gap-3 sm:gap-6 lg:mx-0">
            <div>
              <p className="text-xl font-bold sm:text-2xl">50+</p>
              <p className="text-xs text-slate-500 sm:text-sm">Services</p>
            </div>

            <div>
              <p className="text-xl font-bold sm:text-2xl">10K+</p>
              <p className="text-xs text-slate-500 sm:text-sm">Applications</p>
            </div>

            <div>
              <p className="text-xl font-bold sm:text-2xl">24/7</p>
              <p className="text-xs text-slate-500 sm:text-sm">Tracking</p>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:rounded-3xl sm:p-6 lg:max-w-none lg:shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 sm:pb-5">
            <div>
              <p className="text-xs text-slate-500 sm:text-sm">Welcome back</p>
              <h2 className="text-lg font-bold sm:text-xl">
                Customer Dashboard
              </h2>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 sm:h-11 sm:w-11">
              👤
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4">
            <div className="rounded-xl bg-blue-50 p-3 sm:rounded-2xl sm:p-4">
              <p className="text-xs text-slate-500 sm:text-sm">
                Total Applications
              </p>
              <p className="mt-2 text-2xl font-bold text-blue-700 sm:text-3xl">
                08
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-3 sm:rounded-2xl sm:p-4">
              <p className="text-xs text-slate-500 sm:text-sm">Completed</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700 sm:text-3xl">
                05
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;