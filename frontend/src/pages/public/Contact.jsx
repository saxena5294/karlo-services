import PageHeader from "../../components/common/PageHeader";

const Contact = () => <>
  <PageHeader eyebrow="Support" title="Contact us" description="Need help choosing a service or locating an application number? Reach out to the Karlo support team." />
  <section className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-2">
    <article className="rounded-2xl border border-slate-200 bg-white p-7"><p className="text-sm font-semibold text-blue-700">Email</p><a href="mailto:support@karlo.in" className="mt-2 block text-xl font-bold">support@karlo.in</a><p className="mt-3 text-slate-600">Send your application number when asking about an existing request.</p></article>
    <article className="rounded-2xl border border-slate-200 bg-white p-7"><p className="text-sm font-semibold text-blue-700">Phone</p><a href="tel:+919876543210" className="mt-2 block text-xl font-bold">+91 98765 43210</a><p className="mt-3 text-slate-600">Monday–Saturday, 9 AM–7 PM</p></article>
  </section>
</>;

export default Contact;
