import { ClipboardList, FileText, Headphones, ListChecks, Store, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import AdvertisementBanner from "../../components/dashboard/AdvertisementBanner";
import ComingSoonFeature from "../../components/dashboard/ComingSoonFeature";
import DashboardNotice from "../../components/dashboard/DashboardNotice";

const shortcuts = [
  ["Services", "Browse the managed service catalogue.", "/partner/services", Wrench],
  ["Form history", "Review applications assigned to your partner account.", "/partner/form-history", ClipboardList],
  ["Help & support", "Create tickets and contact the support team.", "/partner/help", Headphones],
  ["Declaration forms", "Download administrator-published forms.", "/partner/declaration-forms", FileText],
];

const PartnerDashboard = () => <div className="space-y-8">
  <DashboardNotice audience="partner" />
  <AdvertisementBanner />
  <section><h1 className="text-2xl font-bold">Partner dashboard</h1><p className="mt-1 text-slate-500">Manage active partner services, records, resources, and support.</p><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{shortcuts.map(([title, description, path, Icon]) => <Link key={path} to={path} className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-blue-300"><Icon className="text-blue-700" /><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></Link>)}</div></section>
  <section><h2 className="text-xl font-bold">Partner lead features</h2><p className="mt-1 text-sm text-slate-500">These modules are visible but cannot be opened or make requests yet.</p><div className="mt-4 grid gap-4 md:grid-cols-3"><ComingSoonFeature compact title="Available Leads" icon={Store} /><ComingSoonFeature compact title="Accepted Leads" icon={ListChecks} /><ComingSoonFeature compact title="Accepted Work" icon={ClipboardList} /></div></section>
</div>;

export default PartnerDashboard;
