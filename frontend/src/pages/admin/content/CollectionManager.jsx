import { useEffect, useMemo, useState } from "react";
import { getAdminServices } from "../../../api/adminApi";
import ConfirmDialog from "../../../components/dashboard/ConfirmDialog";
import EmptyState from "../../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../../components/dashboard/LoadingSkeleton";

const configs = {
  banner: { title: "Banners", singular: "Banner", nameKey: "title", defaults: { title: "", description: "", buttonText: "", buttonLink: "", position: "homepage", order: 0, isActive: true, status: "draft", startAt: "", endAt: "" }, fields: [["title", "Title"], ["description", "Description", "textarea"], ["buttonText", "Button text"], ["buttonLink", "Button link"], ["position", "Position", "position"], ["startAt", "Starts at", "datetime-local"], ["endAt", "Ends at", "datetime-local"], ["order", "Display order", "number"]] },
  faq: { title: "FAQs", singular: "FAQ", nameKey: "question", defaults: { question: "", answer: "", category: "General", displayOrder: 0, order: 0, isFeatured: false, isActive: true, audience: ["public", "customer", "partner"], keywords: "", status: "draft" }, fields: [["question", "Question"], ["answer", "Answer", "textarea"], ["displayOrder", "Display order", "number"]] },
  testimonial: { title: "Testimonials", singular: "Testimonial", nameKey: "customerName", defaults: { customerName: "", customerRole: "", message: "", rating: 5, serviceId: "", order: 0, isActive: true, status: "draft" }, fields: [["customerName", "Customer name"], ["customerRole", "Customer role"], ["message", "Message", "textarea"], ["rating", "Rating", "rating"], ["serviceId", "Related service", "service"], ["order", "Display order", "number"]] },
};
const emptyPagination = { page: 1, limit: 10, total: 0, pages: 0 };
const toDateInput = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";

const CollectionManager = ({ type, api }) => {
  const config = configs[type];
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [form, setForm] = useState({ ...config.defaults });
  const [editingId, setEditingId] = useState(null);
  const [image, setImage] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "", position: "", category: "", audience: "", featured: "" });
  const [page, setPage] = useState(1);
  const [services, setServices] = useState([]);
  const [serviceError, setServiceError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const applyList = (result) => { setItems(result.data?.items || []); setPagination(result.data?.pagination || emptyPagination); };
  const params = useMemo(() => ({ page, limit: 10, ...(filters.search.trim() ? { search: filters.search.trim() } : {}), ...(filters.status ? { status: filters.status } : {}), ...(type === "banner" && filters.position ? { position: filters.position } : {}), ...(type === "faq" && filters.category ? { category: filters.category } : {}), ...(type === "faq" && filters.audience ? { audience: filters.audience } : {}), ...(type === "faq" && filters.featured ? { featured: filters.featured } : {}) }), [page, filters.search, filters.status, filters.position, filters.category, filters.audience, filters.featured, type]);

  useEffect(() => {
    let active = true;
    api.list(params).then((result) => { if (active) { applyList(result); setLoadError(""); } }).catch((requestError) => { if (active) setLoadError(requestError.response?.data?.message || `Unable to load ${config.title.toLowerCase()}.`); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, config.title, params]);

  useEffect(() => {
    if (type !== "testimonial") return;
    getAdminServices({ limit: 100 }).then((result) => setServices(result.services || [])).catch((requestError) => setServiceError(requestError.response?.data?.message || "Unable to load services."));
  }, [type]);

  const refresh = async ({ showLoading = false } = {}) => {
    if (showLoading) setLoading(true); setLoadError("");
    try { applyList(await api.list(params)); } catch (requestError) { setLoadError(requestError.response?.data?.message || `Unable to load ${config.title.toLowerCase()}.`); } finally { if (showLoading) setLoading(false); }
  };
  const visibleItems = useMemo(() => items.filter((item) => !filters.search || [item[config.nameKey], item.answer, item.category, ...(item.keywords || [])].some((value) => String(value || "").toLowerCase().includes(filters.search.toLowerCase()))), [items, filters.search, config.nameKey]);
  const editingItem = items.find((item) => item._id === editingId);
  const resetForm = () => { setForm({ ...config.defaults }); setEditingId(null); setImage(null); };
  const edit = (item) => { setEditingId(item._id); setImage(null); setForm(Object.fromEntries(Object.keys(config.defaults).map((key) => [key, key === "startAt" || key === "endAt" ? toDateInput(item[key]) : key === "keywords" ? (item.keywords || []).join(", ") : key === "audience" ? (item.audience || ["public", "customer", "partner"]) : ((item[key]?._id || item[key]) ?? config.defaults[key])]))); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const payload = () => ({ ...form, order: Number(type === "faq" ? form.displayOrder : form.order), ...(type === "faq" ? { displayOrder: Number(form.displayOrder), keywords: form.keywords.split(",").map((item) => item.trim()).filter(Boolean), audience: form.audience } : {}), ...(type === "testimonial" ? { rating: Number(form.rating), serviceId: form.serviceId || null } : {}), ...(type === "banner" ? { startAt: form.startAt || null, endAt: form.endAt || null } : {}) });
  const requestPayload = () => {
    const values = payload(); if (!image) return values;
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) formData.append(key, value == null ? "" : String(value));
    formData.append("image", image); return formData;
  };
  const submit = async (event) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setActionError(""); setSuccess("");
    try { if (editingId) await api.update(editingId, requestPayload()); else await api.create(requestPayload()); setSuccess(`${config.singular} saved successfully.`); resetForm(); await refresh(); } catch (requestError) { setActionError(requestError.response?.data?.message || `Unable to save ${config.singular.toLowerCase()}.`); } finally { setSaving(false); }
  };
  const updateStatus = async (item, patch) => {
    if (updatingId) return; setUpdatingId(item._id); setActionError(""); setSuccess("");
    try { await api.status(item._id, patch); setSuccess(`${config.singular} status updated.`); await refresh(); } catch (requestError) { setActionError(requestError.response?.data?.message || "Unable to update status."); } finally { setUpdatingId(null); }
  };
  const updateOrder = async (item, order) => {
    if (updatingId || order < 0) return; setUpdatingId(item._id); setActionError("");
    try { await api.order(item._id, order); setSuccess(`${config.singular} order updated.`); await refresh(); } catch (requestError) { setActionError(requestError.response?.data?.message || "Unable to update order."); } finally { setUpdatingId(null); }
  };
  const changeFilter = (key, value) => { setLoading(true); setPage(1); setFilters((current) => ({ ...current, [key]: value })); };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-2">
        <div className="flex items-center justify-between md:col-span-2"><h2 className="text-xl font-bold">{editingId ? "Edit" : "Create"} {config.singular}</h2>{editingId && <button type="button" onClick={resetForm} className="text-sm font-semibold text-blue-700">Cancel edit</button>}</div>
        {config.fields.map(([key, fieldLabel, kind]) => <label key={key} className={`text-sm font-semibold ${kind === "textarea" ? "md:col-span-2" : ""}`}>{fieldLabel}{kind === "textarea" ? <textarea required={["message", "answer"].includes(key)} rows="4" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /> : kind === "position" ? <select value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5"><option value="homepage">Homepage</option><option value="services">Services</option><option value="dashboard">Dashboard</option></select> : kind === "rating" ? <select value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5">{[1, 2, 3, 4, 5].map((rating) => <option key={rating}>{rating}</option>)}</select> : kind === "service" ? <select value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5"><option value="">No service</option>{services.map((service) => <option key={service._id} value={service._id}>{service.title}</option>)}</select> : <input required={["title", "question", "customerName"].includes(key)} type={kind || "text"} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" />}</label>)}
        {type === "faq" && <><label className="text-sm font-semibold">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5">{["General", "Services", "Documents", "Applications", "Payments", "OTP & Security", "Technical", "Refund", "Support", "Partner"].map((category) => <option key={category}>{category}</option>)}</select></label><label className="text-sm font-semibold">Keywords (comma separated)<input value={form.keywords} onChange={(event) => setForm({ ...form, keywords: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label><fieldset className="md:col-span-2"><legend className="text-sm font-semibold">Audience</legend><div className="mt-2 flex flex-wrap gap-4">{["public", "customer", "partner"].map((audience) => <label key={audience} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={form.audience.includes(audience)} onChange={(event) => setForm({ ...form, audience: event.target.checked ? [...form.audience, audience] : form.audience.filter((item) => item !== audience) })} /> {audience}</label>)}</div></fieldset></>}
        <label className="text-sm font-semibold">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5"><option value="draft">Draft</option><option value="published">Published</option></select></label>
        {type !== "faq" && <label className="text-sm font-semibold">Image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files[0] || null)} className="mt-1 block w-full" /></label>}
        {type !== "faq" && (image || editingItem?.image?.url) && <img src={image ? URL.createObjectURL(image) : editingItem.image.url} alt={`${config.singular} preview`} className="h-28 w-full rounded-xl object-cover" />}
        <label className="flex items-center gap-2 self-end"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Active</label>
        {type === "faq" && <label className="flex items-center gap-2 self-end"><input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} /> Featured question</label>}
        {serviceError && <p role="alert" className="text-sm text-amber-700 md:col-span-2">{serviceError}</p>}
        <button disabled={saving} className="rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50 md:col-span-2">{saving ? "Saving…" : `Save ${config.singular.toLowerCase()}`}</button>
      </form>
      {actionError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap gap-3"><input aria-label={`Search ${config.title}`} placeholder="Search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} className="min-w-48 flex-1 rounded-lg border p-2.5" /><select aria-label="Filter by status" value={filters.status} onChange={(event) => changeFilter("status", event.target.value)} className="rounded-lg border p-2.5"><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option></select>{type === "banner" && <select aria-label="Filter by position" value={filters.position} onChange={(event) => changeFilter("position", event.target.value)} className="rounded-lg border p-2.5"><option value="">All positions</option><option value="homepage">Homepage</option><option value="services">Services</option><option value="dashboard">Dashboard</option></select>}{type === "faq" && <input aria-label="Filter by category" placeholder="Category" value={filters.category} onChange={(event) => changeFilter("category", event.target.value)} className="rounded-lg border p-2.5" />}</div>
        {type === "faq" && <div className="mt-3 flex flex-wrap gap-3"><select aria-label="Filter FAQ audience" value={filters.audience} onChange={(event) => changeFilter("audience", event.target.value)} className="rounded-lg border p-2.5"><option value="">All audiences</option><option value="public">Public</option><option value="customer">Customer</option><option value="partner">Partner</option></select><select aria-label="Filter featured FAQs" value={filters.featured} onChange={(event) => changeFilter("featured", event.target.value)} className="rounded-lg border p-2.5"><option value="">Featured and standard</option><option value="true">Featured</option><option value="false">Not featured</option></select></div>}
        {loadError && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4"><p className="text-sm text-red-800">{loadError}</p><button type="button" onClick={() => refresh({ showLoading: true })} className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white">Retry</button></div>}
        {loading ? <LoadingSkeleton count={4} /> : !loadError && visibleItems.length === 0 ? <div className="mt-5"><EmptyState title={`No ${config.title.toLowerCase()} found`} description="Create the first item or adjust the current filters." /></div> : <div className="mt-5 grid gap-3">{visibleItems.map((item) => <article key={item._id} className="rounded-xl border p-4"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div className="min-w-0">{item.image?.url && <img src={item.image.url} alt="" className="mb-3 h-24 w-full rounded-lg object-cover sm:w-40" />}<h3 className="font-bold">{item[config.nameKey]}</h3><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description || item.answer || item.message}</p><p className="mt-2 text-xs uppercase text-slate-500">{item.status} · {item.isActive ? "active" : "inactive"} · order {item.order}</p></div><div className="flex flex-wrap items-start gap-2"><button type="button" disabled={Boolean(updatingId)} onClick={() => edit(item)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Edit</button><button type="button" disabled={Boolean(updatingId)} onClick={() => updateStatus(item, { status: item.status === "published" ? "draft" : "published" })} className="rounded-lg border px-3 py-2 text-sm font-semibold">{item.status === "published" ? "Unpublish" : "Publish"}</button><button type="button" disabled={Boolean(updatingId)} onClick={() => updateStatus(item, { isActive: !item.isActive })} className="rounded-lg border px-3 py-2 text-sm font-semibold">{item.isActive ? "Deactivate" : "Activate"}</button><button type="button" disabled={Boolean(updatingId)} onClick={() => updateOrder(item, Math.max(0, item.order - 1))} className="rounded-lg border px-3 py-2 text-sm font-semibold" aria-label={`Move ${item[config.nameKey]} earlier`}>↑</button><button type="button" disabled={Boolean(updatingId)} onClick={() => updateOrder(item, item.order + 1)} className="rounded-lg border px-3 py-2 text-sm font-semibold" aria-label={`Move ${item[config.nameKey]} later`}>↓</button><button type="button" disabled={Boolean(updatingId)} onClick={() => setDeleting(item)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Delete</button></div></div></article>)}</div>}
        {!loading && !loadError && pagination.pages > 1 && <div className="mt-5 flex items-center justify-between"><button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage((current) => current - 1); }} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><span className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages}</span><button type="button" disabled={page >= pagination.pages} onClick={() => { setLoading(true); setPage((current) => current + 1); }} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40">Next</button></div>}
      </section>
      <ConfirmDialog open={Boolean(deleting)} title={`Delete ${config.singular}?`} description="This record will be soft deleted. Its Cloudinary image will be retained." busy={deleteBusy} confirmLabel="Soft delete" onCancel={() => setDeleting(null)} onConfirm={async () => { if (deleteBusy) return; setDeleteBusy(true); setActionError(""); try { await api.remove(deleting._id); setDeleting(null); setSuccess(`${config.singular} soft deleted.`); await refresh(); } catch (requestError) { setActionError(requestError.response?.data?.message || `Unable to delete ${config.singular.toLowerCase()}.`); } finally { setDeleteBusy(false); } }} />
    </div>
  );
};

export default CollectionManager;
