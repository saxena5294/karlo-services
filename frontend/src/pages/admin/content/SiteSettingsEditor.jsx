import { useEffect, useState } from "react";
import { getSiteSettings, updateSiteLogo, updateSiteSeoImage, updateSiteSettings } from "../../../api/adminCmsApi";
import LoadingSkeleton from "../../../components/dashboard/LoadingSkeleton";

const defaults = {
  siteName: "",
  logo: { url: "", altText: "" },
  contact: { phone: "", alternatePhone: "", email: "", supportEmail: "", whatsapp: "", address: "", city: "", state: "", pincode: "", workingHours: "" },
  socialLinks: { facebook: "", instagram: "", youtube: "", linkedin: "", twitter: "" },
  footer: { shortDescription: "", copyrightText: "", supportText: "" },
  legal: { serviceDisclaimer: "", refundDisclaimer: "" },
  seo: { defaultTitle: "", defaultDescription: "", defaultKeywords: [], defaultImage: { url: "" } },
};
const groups = {
  contact: ["phone", "alternatePhone", "email", "supportEmail", "whatsapp", "address", "city", "state", "pincode", "workingHours"],
  socialLinks: ["facebook", "instagram", "youtube", "linkedin", "twitter"],
  footer: ["shortDescription", "copyrightText", "supportText"],
  legal: ["serviceDisclaimer", "refundDisclaimer"],
  seo: ["defaultTitle", "defaultDescription"],
};
const multilineFields = new Set(["address", "shortDescription", "supportText", "serviceDisclaimer", "refundDisclaimer", "defaultDescription"]);
const label = (value) => value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
const normalize = (value = {}) => ({
  ...defaults,
  ...value,
  logo: { ...defaults.logo, ...value.logo },
  contact: { ...defaults.contact, ...value.contact },
  socialLinks: { ...defaults.socialLinks, ...value.socialLinks },
  footer: { ...defaults.footer, ...value.footer },
  legal: { ...defaults.legal, ...value.legal },
  seo: { ...defaults.seo, ...value.seo, defaultImage: { ...defaults.seo.defaultImage, ...value.seo?.defaultImage } },
});

const SiteSettingsEditor = () => {
  const [settings, setSettings] = useState(defaults);
  const [keywords, setKeywords] = useState("");
  const [logo, setLogo] = useState(null);
  const [seoImage, setSeoImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [loaded, setLoaded] = useState(false);

  const applyResult = (result) => {
    const next = normalize(result.data?.settings);
    setSettings(next);
    setKeywords((next.seo.defaultKeywords || []).join(", "));
    setLoaded(true);
  };

  useEffect(() => {
    let active = true;
    getSiteSettings()
      .then((result) => { if (active) applyResult(result); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Unable to load site settings."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const retry = async () => {
    setLoading(true); setError("");
    try { applyResult(await getSiteSettings()); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to load site settings."); } finally { setLoading(false); }
  };
  const change = (group, key, value) => setSettings((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  const submit = async (event) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      let result = await updateSiteSettings({ siteName: settings.siteName, logo: { altText: settings.logo.altText }, contact: settings.contact, socialLinks: settings.socialLinks, footer: settings.footer, legal: settings.legal, seo: { defaultTitle: settings.seo.defaultTitle, defaultDescription: settings.seo.defaultDescription, defaultKeywords: keywords.split(",").map((item) => item.trim()).filter(Boolean) } });
      if (logo) { const formData = new FormData(); formData.append("image", logo); result = await updateSiteLogo(formData); }
      if (seoImage) { const formData = new FormData(); formData.append("image", seoImage); result = await updateSiteSeoImage(formData); }
      applyResult(result); setLogo(null); setSeoImage(null); setSuccess("Site settings updated successfully.");
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to update site settings."); } finally { setSaving(false); }
  };

  if (loading) return <LoadingSkeleton count={6} />;
  if (!loaded) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6"><h2 className="font-bold text-red-800">Site settings could not be loaded</h2><p className="mt-2 text-sm text-red-700">{error}</p><button type="button" onClick={retry} className="mt-4 rounded-xl bg-red-700 px-4 py-2 font-semibold text-white">Retry</button></div>;

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
      <section className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-2">
        <h2 className="text-xl font-bold md:col-span-2">Brand</h2>
        <label className="text-sm font-semibold">Site name<input value={settings.siteName} onChange={(event) => setSettings((current) => ({ ...current, siteName: event.target.value }))} className="mt-1 w-full rounded-lg border p-2.5" /></label>
        <label className="text-sm font-semibold">Logo alt text<input value={settings.logo.altText} onChange={(event) => change("logo", "altText", event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label>
        <label className="text-sm font-semibold">Replace logo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setLogo(event.target.files[0] || null)} className="mt-1 block w-full" /></label>
        {(logo || settings.logo.url) && <img src={logo ? URL.createObjectURL(logo) : settings.logo.url} alt="Logo preview" className="h-24 max-w-full rounded-xl object-contain" />}
      </section>
      {Object.entries(groups).map(([group, fields]) => (
        <section key={group} className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-2">
          <h2 className="text-xl font-bold capitalize md:col-span-2">{group.replace(/([A-Z])/g, " $1")}</h2>
          {fields.map((key) => <label key={key} className={`text-sm font-semibold ${multilineFields.has(key) ? "md:col-span-2" : ""}`}>{label(key)}{multilineFields.has(key) ? <textarea rows="3" value={settings[group][key]} onChange={(event) => change(group, key, event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /> : <input value={settings[group][key]} onChange={(event) => change(group, key, event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" />}</label>)}
        </section>
      ))}
      <section className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-2">
        <h2 className="text-xl font-bold md:col-span-2">SEO extras</h2>
        <label className="text-sm font-semibold md:col-span-2">Keywords (comma separated)<input value={keywords} onChange={(event) => setKeywords(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5" /></label>
        <label className="text-sm font-semibold">Replace SEO image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setSeoImage(event.target.files[0] || null)} className="mt-1 block w-full" /></label>
        {(seoImage || settings.seo.defaultImage.url) && <img src={seoImage ? URL.createObjectURL(seoImage) : settings.seo.defaultImage.url} alt="SEO preview" className="h-28 w-full rounded-xl object-cover" />}
      </section>
      <button disabled={saving} className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save site settings"}</button>
    </form>
  );
};

export default SiteSettingsEditor;
