import { useEffect, useState } from "react";
import { getExpertProfile, updateExpertProfile } from "../../api/expertApi";

const splitList = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);

const ExpertProfile = () => {
  const [form, setForm] = useState({ displayName: "", phone: "", categories: "", skills: "", availability: false });
  const [status, setStatus] = useState("pending");
  const [feedback, setFeedback] = useState("");
  useEffect(() => { getExpertProfile().then(({ profile }) => { setStatus(profile.status); setForm({ displayName: profile.displayName || "", phone: profile.phone || "", categories: (profile.categories || []).join(", "), skills: (profile.skills || []).join(", "), availability: Boolean(profile.availability) }); }).catch((error) => setFeedback(error.response?.data?.message || "Unable to load expert profile.")); }, []);
  const submit = async (event) => { event.preventDefault(); setFeedback(""); try { await updateExpertProfile({ ...form, categories: splitList(form.categories), skills: splitList(form.skills) }); setFeedback(status === "pending" ? "Profile saved. Admin approval is still pending." : "Profile saved."); } catch (error) { setFeedback(error.response?.data?.message || "Unable to save expert profile."); } };
  return <div className="mx-auto max-w-2xl"><h1 className="text-2xl font-bold">Expert profile</h1><p className="mt-2 text-slate-500">Add your skills and service categories for assignment matching.</p>{feedback && <p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">{feedback}</p>}<form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border bg-white p-6 shadow-sm">{[["displayName","Display name"],["phone","Mobile"],["categories","Service categories (comma separated)"],["skills","Skills (comma separated)"]].map(([name,label]) => <label key={name} className="block text-sm font-semibold">{label}<input required={["displayName","phone","skills"].includes(name)} value={form[name]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" /></label>)}<label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.availability} onChange={(event) => setForm((current) => ({ ...current, availability: event.target.checked }))} /> Available for assignments after approval</label><button className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">Save expert profile</button></form></div>;
};

export default ExpertProfile;
