import { Headphones, Mail, MessageCircle, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { getDashboardContent } from "../../api/publicCmsApi";
import ComingSoonFeature from "../../components/dashboard/ComingSoonFeature";
import { dashboardFeatures } from "../../config/dashboardFeatures";

const serviceQueries = ["Instant Service", "Government ID Card", "Education", "Sarkari Result", "Online Form", "Other Services"];
const transactionQueries = ["Transaction Failed or Pending", "Add Balance", "Refund", "Cashback"];
const validPhone = (value = "") => value.replace(/\D/g, "").match(/^\d{10,15}$/)?.[0];

const PartnerHelp = () => {
  const [contact, setContact] = useState({});
  useEffect(() => { let active = true; getDashboardContent().then(({ data }) => active && setContact(data?.siteSettings?.contact || {})).catch(() => {}); return () => { active = false; }; }, []);
  const phones = [contact.phone, contact.alternatePhone].filter(Boolean);
  const whatsapp = validPhone(contact.whatsapp);
  return <div className="space-y-7"><header><h1 className="text-2xl font-bold">Help & tickets</h1><p className="mt-1 text-slate-500">Support information is managed through Site Settings.</p></header><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{phones.map((phone) => <a key={phone} href={`tel:${validPhone(phone) || ""}`} className="rounded-2xl border bg-white p-5 shadow-sm"><Phone className="text-blue-700" /><p className="mt-3 text-sm text-slate-500">Helpline</p><p className="font-bold">{phone}</p></a>)}{(contact.supportEmail || contact.email) && <a href={`mailto:${contact.supportEmail || contact.email}`} className="rounded-2xl border bg-white p-5 shadow-sm"><Mail className="text-blue-700" /><p className="mt-3 text-sm text-slate-500">Email</p><p className="break-all font-bold">{contact.supportEmail || contact.email}</p></a>}{whatsapp && dashboardFeatures.whatsappSupport ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="rounded-2xl border bg-white p-5 shadow-sm"><MessageCircle className="text-emerald-700" /><p className="mt-3 font-bold">WhatsApp support</p></a> : <ComingSoonFeature compact title="WhatsApp Support" icon={MessageCircle} />}</section><section className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Service-related queries</h2><ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">{serviceQueries.map((item) => <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">{item}</li>)}</ul></article><article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Transaction-related queries</h2><ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">{transactionQueries.map((item) => <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">{item}</li>)}</ul></article></section><ComingSoonFeature title="Support ticket actions" description="Ticket creation, replies, attachments, assignment, and status management will be enabled after the complete secured ticket workflow is available." icon={Headphones} /></div>;
};

export default PartnerHelp;
