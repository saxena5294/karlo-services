const PageHeader = ({ eyebrow, title, description }) => (
  <section className="border-b border-slate-200 bg-gradient-to-br from-blue-50 via-white to-orange-50">
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {eyebrow && <p className="font-semibold text-blue-700">{eyebrow}</p>}
      <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl lg:text-5xl">{title}</h1>
      {description && <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{description}</p>}
    </div>
  </section>
);

export default PageHeader;
