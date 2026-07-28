import { useOutletContext } from "react-router-dom";
import CmsSeo from "../../components/common/CmsSeo";
import PageHeader from "../../components/common/PageHeader";

const Contact = () => {
  const { data } = useOutletContext();
  const contact = data?.siteSettings?.contact || {};
  const email = contact.supportEmail || contact.email || "support@karlo.in";
  const phone = contact.phone || "+91 98765 43210";
  return <>
    <CmsSeo pageKey="contact" />
    <PageHeader eyebrow="Support" title="Contact us" description={contact.supportText || "Need help choosing a service or locating an application number? Reach out to the Karlo support team."} />
    <section className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-7"><p className="text-sm font-semibold text-blue-700">Email</p><a href={`mailto:${email}`} className="mt-2 block text-xl font-bold">{email}</a>{contact.salesEmail && <p className="mt-3 text-slate-600">Sales: {contact.salesEmail}</p>}</article>
      <article className="rounded-2xl border border-slate-200 bg-white p-7"><p className="text-sm font-semibold text-blue-700">Phone</p><a href={`tel:${phone}`} className="mt-2 block text-xl font-bold">{phone}</a><p className="mt-3 text-slate-600">{contact.workingHours || "Monday–Saturday, 9 AM–7 PM"}</p></article>
      {contact.address && <article className="rounded-2xl border border-slate-200 bg-white p-7 md:col-span-2"><p className="text-sm font-semibold text-blue-700">Office</p><p className="mt-2 text-lg font-bold">{contact.address}</p>{contact.mapUrl && <a href={contact.mapUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block font-semibold text-blue-700">View map →</a>}</article>}
    </section>
  </>;
};

export default Contact;
