import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPartner, getAdminPartners, updatePartnerVerification } from "../../api/adminApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";

const initialPartner = { userId: "", businessName: "", ownerName: "", mobile: "", email: "", city: "", state: "", pincode: "", businessType: "" };
const AdminPartners = () => {
  const [partners, setPartners] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState(initialPartner);
  const [showCreate, setShowCreate] = useState(false);
  useEffect(() => { let active = true; getAdminPartners({ verificationStatus: status || undefined, limit: 100 }).then((response) => active && setPartners(response.partners)).catch((requestError) => active && setError(requestError.response?.data?.message || "Unable to load partners.")); return () => { active = false; }; }, [status, refresh]);
  const verify = async (item, verificationStatus) => { try { await updatePartnerVerification(item._id, verificationStatus); setRefresh((value) => value + 1); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to update partner."); } };
  const submit = async (event) => { event.preventDefault(); setError(""); try { await createPartner(form); setForm(initialPartner); setShowCreate(false); setRefresh((value) => value + 1); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to create partner."); } };
  return <div className="space-y-6"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">Partners</h1><p className="mt-1 text-slate-500">Approve website registrations or create an immediately active partner.</p></div><button onClick={() => setShowCreate((value) => !value)} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">{showCreate ? "Cancel" : "Create partner"}</button></div>
    {showCreate && <form onSubmit={submit} className="grid gap-3 rounded-2xl border bg-white p-5 shadow-sm sm:grid-cols-3">{Object.keys(initialPartner).map((key) => <label key={key} className="text-xs font-semibold capitalize">{key.replace(/([A-Z])/g, " $1")}<input required={key !== "email"} type={key === "email" ? "email" : "text"} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal" /></label>)}<button className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white sm:col-span-3">Create active partner</button></form>}
    <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border px-3 py-2"><option value="">All verification states</option>{["pending", "under_review", "approved", "rejected", "suspended"].map((value) => <option key={value}>{value}</option>)}</select>{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{!partners ? <LoadingSkeleton count={5} /> : !partners.length ? <EmptyState title="No partners" description="Partner applications will appear here." /> : <div className="grid gap-4 lg:grid-cols-2">{partners.map((item) => <article key={item._id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><Link to={`/admin/partners/${item._id}`} className="font-bold text-blue-700">{item.businessName}</Link><p className="text-xs text-slate-500">{item.city}, {item.state} · {item.userId}</p></div><span className="text-xs font-semibold uppercase">{item.verificationStatus}</span></div><select aria-label={`Verification for ${item.businessName}`} value={item.verificationStatus} onChange={(event) => verify(item, event.target.value)} className="mt-4 w-full rounded-lg border px-3 py-2 text-sm">{["pending", "under_review", "approved", "rejected", "suspended"].map((value) => <option key={value}>{value}</option>)}</select></article>)}</div>}</div>;
};
export default AdminPartners;
