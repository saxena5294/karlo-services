import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../../../components/dashboard/ConfirmDialog";
import EmptyState from "../../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../../components/dashboard/LoadingSkeleton";

const configs = {
  category: {
    title: "Categories", singular: "Category", name: "name", image: true,
    defaults: { name: "", slug: "", description: "", icon: "Folder", displayOrder: 0, isActive: true, seoTitle: "", seoDescription: "" },
    fields: [["name", "Name"], ["slug", "Slug"], ["description", "Description", "textarea"], ["icon", "Icon"], ["displayOrder", "Display order", "number"], ["seoTitle", "SEO title"], ["seoDescription", "SEO description", "textarea"]],
  },
  notice: {
    title: "Notices", singular: "Notice", name: "title",
    defaults: { title: "", message: "", type: "info", linkText: "", linkUrl: "", priority: 0, isPinned: false, startsAt: "", endsAt: "", isActive: true },
    fields: [["title", "Title"], ["message", "Message", "textarea"], ["type", "Type", "notice-type"], ["linkText", "Link text"], ["linkUrl", "Link URL"], ["priority", "Priority", "number"], ["startsAt", "Starts at", "datetime-local"], ["endsAt", "Ends at", "datetime-local"]],
  },
  blog: {
    title: "Blogs", singular: "Blog post", name: "title", image: true,
    defaults: { title: "", slug: "", excerpt: "", content: "", category: "General", tags: "", author: "", status: "draft", publishedAt: "", scheduledAt: "", seoTitle: "", seoDescription: "", seoKeywords: "", isFeatured: false },
    fields: [["title", "Title"], ["slug", "Slug"], ["excerpt", "Excerpt", "textarea"], ["content", "Article content", "article"], ["category", "Category"], ["tags", "Tags (comma separated)"], ["author", "Author"], ["status", "Status", "blog-status"], ["publishedAt", "Published at", "datetime-local"], ["scheduledAt", "Schedule for", "datetime-local"], ["seoTitle", "SEO title"], ["seoDescription", "SEO description", "textarea"], ["seoKeywords", "SEO keywords"]],
  },
  seo: {
    title: "Page SEO", singular: "SEO record", name: "pageKey", image: true,
    defaults: { pageKey: "homepage", title: "", description: "", keywords: "", canonicalUrl: "", ogTitle: "", ogDescription: "", noIndex: false, noFollow: false, isActive: true },
    fields: [["pageKey", "Page", "page-key"], ["title", "Title"], ["description", "Description", "textarea"], ["keywords", "Keywords"], ["canonicalUrl", "Canonical URL"], ["ogTitle", "Open Graph title"], ["ogDescription", "Open Graph description", "textarea"]],
  },
};
const inputClass = "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const toInputDate = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";
const normalize = (config, item) => Object.fromEntries(Object.keys(config.defaults).map((key) => {
  if (["startsAt", "endsAt", "publishedAt", "scheduledAt"].includes(key)) return [key, toInputDate(item[key])];
  if (["tags", "seoKeywords", "keywords"].includes(key)) return [key, (item[key] || []).join(", ")];
  return [key, item[key] ?? config.defaults[key]];
}));

const ExtendedCollectionManager = ({ type, api }) => {
  const config = configs[type];
  const [items, setItems] = useState(null);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState(null);
  const [image, setImage] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try { const result = await api.list({ limit: 100 }); setItems(result.data.items); }
    catch (error) { setFeedback({ type: "error", message: error.response?.data?.message || `Unable to load ${config.title.toLowerCase()}.` }); }
  };
  useEffect(() => {
    let active = true;
    config.api.list({ limit: 100 }).then((result) => {
      if (active) setItems(result.data.items || []);
    }).catch((error) => {
      if (active) setFeedback({ type: "error", message: error.response?.data?.message || `Unable to load ${config.title.toLowerCase()}.` });
    });
    return () => { active = false; };
  }, [config]);
  const visible = useMemo(() => (items || []).filter((item) => String(item[config.name] || "").toLowerCase().includes(search.trim().toLowerCase())), [items, search, config.name]);
  const open = (item = null) => { setEditor({ id: item?._id || "", values: item ? normalize(config, item) : { ...config.defaults } }); setImage(null); setFeedback(null); };
  const change = (key, value) => setEditor((current) => ({ ...current, values: { ...current.values, [key]: value, ...(key === "title" || key === "name" ? { slug: current.values.slug || value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } : {}) } }));
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setFeedback(null);
    try {
      const payload = { ...editor.values };
      for (const key of ["tags", "seoKeywords", "keywords"]) if (payload[key] !== undefined) payload[key] = payload[key].split(",").map((value) => value.trim()).filter(Boolean);
      let requestPayload = payload;
      if (image) { requestPayload = new FormData(); Object.entries(payload).forEach(([key, value]) => requestPayload.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value))); requestPayload.append("image", image); }
      if (editor.id) await api.update(editor.id, requestPayload); else await api.create(requestPayload);
      setFeedback({ type: "success", message: `${config.singular} saved successfully.` }); setEditor(null); setImage(null); await load();
    } catch (error) { setFeedback({ type: "error", message: error.response?.data?.message || `Unable to save ${config.singular.toLowerCase()}.` }); }
    finally { setBusy(false); }
  };
  const remove = async () => { setBusy(true); try { await api.remove(deleting._id); setDeleting(null); setFeedback({ type: "success", message: `${config.singular} removed.` }); await load(); } catch (error) { setFeedback({ type: "error", message: error.response?.data?.message || "Unable to remove record." }); } finally { setBusy(false); } };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold">{config.title}</h2><p className="text-sm text-slate-500">Manage dynamic {config.title.toLowerCase()} shown across Karlo Services.</p></div><button type="button" onClick={() => open()} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white"><Plus size={18}/> Add {config.singular.toLowerCase()}</button></div>
    {feedback && <p role={feedback.type === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${feedback.type === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{feedback.message}</p>}
    <label className="relative block max-w-md"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} className={`${inputClass} mt-0 pl-10`}/></label>
    {editor && <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm md:grid-cols-2"><div className="flex items-center justify-between md:col-span-2"><h3 className="text-xl font-bold">{editor.id ? "Edit" : "Add"} {config.singular}</h3><button type="button" onClick={() => setEditor(null)} className="p-2"><X size={20}/></button></div>
      {config.fields.map(([key, label, kind]) => <label key={key} className={`text-sm font-semibold ${["textarea", "article"].includes(kind) ? "md:col-span-2" : ""}`}>{label}
        {kind === "textarea" || kind === "article" ? <textarea required={["message", "content", "excerpt", "description"].includes(key) && type !== "category"} rows={kind === "article" ? 12 : 3} value={editor.values[key]} onChange={(event) => change(key, event.target.value)} className={inputClass}/>
          : kind === "notice-type" ? <select value={editor.values[key]} onChange={(event) => change(key, event.target.value)} className={inputClass}>{["info", "success", "warning", "urgent"].map((value) => <option key={value}>{value}</option>)}</select>
            : kind === "blog-status" ? <select value={editor.values[key]} onChange={(event) => change(key, event.target.value)} className={inputClass}><option value="draft">Draft</option><option value="published">Published</option></select>
              : kind === "page-key" ? <select value={editor.values[key]} onChange={(event) => change(key, event.target.value)} className={inputClass}>{["homepage", "services", "contact", "faq", "blogs"].map((value) => <option key={value}>{value}</option>)}</select>
                : <input required={["name", "title", "author"].includes(key)} type={kind || "text"} value={editor.values[key]} onChange={(event) => change(key, event.target.value)} className={inputClass}/>}
      </label>)}
      {config.image && <label className="text-sm font-semibold md:col-span-2">Upload/replace image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} className={inputClass}/></label>}
      <div className="flex flex-wrap gap-5 md:col-span-2">{Object.keys(config.defaults).filter((key) => ["isActive", "isPinned", "isFeatured", "noIndex", "noFollow"].includes(key)).map((key) => <label key={key} className="flex items-center gap-2 text-sm font-semibold capitalize"><input type="checkbox" checked={Boolean(editor.values[key])} onChange={(event) => change(key, event.target.checked)}/>{key.replace(/([A-Z])/g, " $1")}</label>)}</div>
      <button disabled={busy} className="rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white md:col-span-2 disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
    </form>}
    {!items ? <LoadingSkeleton count={5}/> : !visible.length ? <EmptyState title={`No ${config.title.toLowerCase()} found`} description="Add the first record or change your search."/> : <div className="grid gap-3 md:grid-cols-2">{visible.map((item) => <article key={item._id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><h3 className="font-bold">{item[config.name]}</h3><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description || item.message || item.excerpt || item.title}</p></div><span className={`h-fit rounded-full px-2.5 py-1 text-xs font-bold ${item.isActive === false || item.status === "draft" ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}>{item.status || (item.isActive ? "Active" : "Inactive")}</span></div>{type === "category" && <p className="mt-3 text-sm font-semibold text-blue-700">{item.serviceCount || 0} active services</p>}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => open(item)} className="rounded-lg border p-2 text-blue-700" aria-label={`Edit ${item[config.name]}`}><Pencil size={17}/></button><button type="button" onClick={() => setDeleting(item)} className="rounded-lg border p-2 text-rose-700" aria-label={`Delete ${item[config.name]}`}><Trash2 size={17}/></button></div></article>)}</div>}
    <ConfirmDialog open={Boolean(deleting)} title={`Remove ${config.singular}?`} description={type === "category" ? "Categories used by active services cannot be removed." : "This record will be safely removed from public content."} busy={busy} confirmLabel="Remove" onCancel={() => setDeleting(null)} onConfirm={remove}/>
  </div>;
};

export default ExtendedCollectionManager;
