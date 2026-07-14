import PageHeader from "../../components/common/PageHeader";

const About = () => <>
  <PageHeader eyebrow="About Karlo" title="Digital services made easier" description="Karlo brings common government, documentation, tax, and business service applications into one clear online experience." />
  <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
    {[["Simple process", "Choose a service and complete only the fields configured for it."], ["Secure uploads", "Documents move through the backend to managed cloud storage."], ["Easy tracking", "Every successful submission returns an application number for status checks."]].map(([title, text]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">{title}</h2><p className="mt-3 leading-7 text-slate-600">{text}</p></article>)}
  </section>
</>;

export default About;
