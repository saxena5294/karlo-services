import { useState } from "react";
import { registerPartner } from "../../api/partnerApi";

const initial = { businessName: "", ownerName: "", mobile: "", email: "", city: "", state: "", pincode: "", businessType: "" };
const PartnerRegistration = () => {
  const [form, setForm] = useState(initial);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setFeedback("");
    try { await registerPartner(form); setFeedback("Registration submitted. An admin must approve your profile before work can be assigned."); setForm(initial); }
    catch (error) { setFeedback(error.response?.data?.message || "Unable to submit registration."); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-3xl"><h1 className="text-2xl font-bold">Become a Karlo Services partner</h1><p className="mt-1 text-slate-500">Submit your business details for admin approval.</p>{feedback && <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">{feedback}</p>}<form onSubmit={submit} className="mt-6 grid gap-4 rounded-2xl border bg-white p-6 shadow-sm sm:grid-cols-2">{Object.keys(initial).map((key) => <label key={key} className="text-sm font-semibold capitalize">{key.replace(/([A-Z])/g, " $1")}<input required={key !== "email"} type={key === "email" ? "email" : "text"} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>)}<button disabled={busy} className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50 sm:col-span-2">{busy ? "Submitting…" : "Submit for approval"}</button></form></div>;
};
export default PartnerRegistration;
