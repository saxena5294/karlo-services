import { useEffect, useState } from "react";
import { getCrmDirectory } from "../../../api/crmApi";
import EmptyState from "../../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../../components/dashboard/LoadingSkeleton";
import { formatDate } from "../../../utils/dashboardFormatters";
import { CrmBadge, CrmHeader, CrmPagination, CrmTable, crmInput } from "../../../components/crm/CrmUi";

const config = {
  customers: { title: "CRM customers", description: "Application-owned customer identities and activity.", id: "userId", status: ["active","inactive"], columns: [
    { key: "name", label: "Customer", render: (item) => <><strong>{item.name}</strong><span className="block text-xs text-slate-500">{item.userId}</span></> },
    { key: "mobile", label: "Contact", render: (item) => <>{item.email || "—"}<span className="block text-xs text-slate-500">{item.mobile || "—"}</span></> },
    { key: "totalApplications", label: "Applications" }, { key: "status", label: "Status", render: (item) => <CrmBadge value={item.status}/> }, { key: "lastActivity", label: "Last activity", render: (item) => formatDate(item.lastActivity) },
  ] },
  partners: { title: "CRM partners", description: "Authoritative partner profiles, approval, activity, and workload.", id: "userId", status: ["pending","under_review","approved","rejected","suspended"], columns: [
    { key: "businessName", label: "Partner", render: (item) => <><strong>{item.businessName}</strong><span className="block text-xs text-slate-500">{item.ownerName} · {item.userId}</span></> },
    { key: "mobile", label: "Contact", render: (item) => <>{item.mobile}<span className="block text-xs text-slate-500">{item.email || "—"}</span></> }, { key: "city", label: "Region", render: (item) => `${item.city}, ${item.state}` }, { key: "verificationStatus", label: "Approval", render: (item) => <CrmBadge value={item.verificationStatus}/> }, { key: "assignments", label: "Workload", render: (item) => `${item.assignments.active} active / ${item.assignments.completed} done` },
  ] },
  experts: { title: "CRM experts", description: "Expert profiles, expertise, availability, and assigned workload.", id: "userId", status: ["active","inactive","unavailable"], columns: [
    { key: "displayName", label: "Expert", render: (item) => <><strong>{item.displayName}</strong><span className="block text-xs text-slate-500">{item.userId}</span></> }, { key: "phone", label: "Contact", render: (item) => <>{item.email || "—"}<span className="block text-xs text-slate-500">{item.phone || "—"}</span></> }, { key: "skills", label: "Expertise", render: (item) => item.skills?.join(", ") || "General" }, { key: "status", label: "Status", render: (item) => <CrmBadge value={item.status}/> }, { key: "assignments", label: "Workload", render: (item) => `${item.assignments.active} active / ${item.assignments.completed} done` },
  ] },
};

const CrmDirectory = ({ type }) => {
  const settings = config[type]; const [query, setQuery] = useState({ search: "", status: "", page: 1 }); const [data, setData] = useState(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; getCrmDirectory(type, { search: query.search || undefined, status: query.status || undefined, page: query.page, limit: 20 }).then((result) => { if (active) { setData(result); setError(""); } }).catch((requestError) => active && setError(requestError.response?.data?.message || `Unable to load ${type}.`)); return () => { active = false; }; }, [query, type]);
  return <div className="space-y-6"><CrmHeader title={settings.title} description={settings.description}/><div className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-3"><input value={query.search} onChange={(event) => setQuery({ ...query, search: event.target.value, page: 1 })} placeholder="Search name, contact, or ID" className={crmInput}/><select value={query.status} onChange={(event) => setQuery({ ...query, status: event.target.value, page: 1 })} className={crmInput}><option value="">All statuses</option>{settings.status.map((value) => <option key={value}>{value}</option>)}</select></div>{error ? <EmptyState title={`${settings.title} unavailable`} description={error}/> : !data ? <LoadingSkeleton count={6}/> : !data.items.length ? <EmptyState title={`No ${type}`} description="No records match the selected filters."/> : <><CrmTable columns={settings.columns} items={data.items} link={(item) => `/admin/crm/${type}/${encodeURIComponent(item[settings.id])}`}/><CrmPagination pagination={data.pagination} onPage={(page) => setQuery({ ...query, page })}/></>}</div>;
};
export default CrmDirectory;
