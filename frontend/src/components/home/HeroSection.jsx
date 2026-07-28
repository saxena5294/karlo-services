import { Link } from "react-router-dom";

const HeroSection = ({ hero = {} }) => {
  const heading = hero.heading || "Government and digital services, made simple.";
  const highlight = hero.highlightedText || "made simple.";
  const highlightAt = heading.toLowerCase().lastIndexOf(highlight.toLowerCase());
  const stats = hero.stats?.length ? hero.stats : [
    { value: "50+", label: "Services" },
    { value: "10K+", label: "Applications" },
    { value: "24/7", label: "Tracking" },
  ];

  return (
    <section className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-24">
        <div className="text-center lg:text-left">
          <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            {hero.eyebrow || "Trusted digital service platform"}
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {highlightAt >= 0 ? <>{heading.slice(0, highlightAt)}<span className="text-blue-700">{heading.slice(highlightAt, highlightAt + highlight.length)}</span>{heading.slice(highlightAt + highlight.length)}</> : heading}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 lg:mx-0">
            {hero.subheading || "Apply for PAN card, passport, certificates, GST, ITR and other services from one secure platform."}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link to={hero.primaryButton?.link || "/services"} className="rounded-xl bg-blue-700 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-800">
              {hero.primaryButton?.text || "Explore Services"}
            </Link>
            <Link to={hero.secondaryButton?.link || "/track"} className="rounded-xl border border-blue-700 px-6 py-3 text-center font-semibold text-blue-700 transition hover:bg-blue-50">
              {hero.secondaryButton?.text || "Track Application"}
            </Link>
          </div>
          {hero.trustText && <p className="mt-4 text-sm font-medium text-slate-500">{hero.trustText}</p>}
          <div className="mx-auto mt-9 grid max-w-lg grid-cols-3 gap-3 sm:gap-6 lg:mx-0">
            {stats.slice(0, 4).map((stat) => <div key={`${stat.value}-${stat.label}`}><p className="text-xl font-bold sm:text-2xl">{stat.value}</p><p className="text-xs text-slate-500 sm:text-sm">{stat.label}</p></div>)}
          </div>
        </div>
        <div className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6 lg:max-w-none">
          {hero.image?.url
            ? <img src={hero.image.url} alt={hero.image.altText || "Karlo services"} className="h-80 w-full rounded-2xl object-cover" />
            : <div className="flex h-80 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 p-8 text-center text-white"><div><p className="text-sm font-semibold uppercase tracking-widest text-blue-200">One secure platform</p><p className="mt-4 text-3xl font-bold">Apply. Track. Complete.</p><p className="mt-3 text-blue-100">Expert-assisted digital services, available when you need them.</p></div></div>}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
