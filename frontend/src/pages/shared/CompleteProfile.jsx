import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentProfile, updateCurrentProfile } from "../../api/authApi";

const CompleteProfile = () => {
  const [form, setForm] = useState({ name: "", mobile: "", address: "" });
  const [role, setRole] = useState("customer");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => { getCurrentProfile().then(({ profile }) => { setRole(profile.role); setForm({ name: profile.name || "", mobile: profile.mobile || "", address: profile.address || "" }); }).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load profile.")); }, []);
  const submit = async (event) => { event.preventDefault(); setError(""); try { await updateCurrentProfile(form); navigate(`/${role}/dashboard`); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to update profile."); } };
  return <section className="mx-auto max-w-xl px-4 py-12"><h1 className="text-2xl font-bold">Complete your profile</h1><p className="mt-2 text-slate-500">Add the details Karlo needs to support your account.</p>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border bg-white p-6">{Object.keys(form).map((key) => <label key={key} className="block text-sm font-semibold capitalize">{key}<input required={key !== "address" || role !== "customer"} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" /></label>)}<button className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">Save profile</button></form></section>;
};

export default CompleteProfile;
