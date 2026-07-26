import { FilePenLine, Plus, Star, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createAdminDeclarationForm,
  deleteAdminDeclarationForm,
  getAdminDeclarationForms,
  updateAdminDeclarationForm,
} from "../../api/declarationFormsApi";
import ConfirmDialog from "../../components/dashboard/ConfirmDialog";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";

const emptyForm = {
  title: "",
  slug: "",
  category: "",
  description: "",
  language: "English",
  fileUrl: "",
  publicId: "karlo-services/declaration-forms/",
  fileName: "",
  fileType: "pdf",
  visibleTo: ["customer", "partner"],
  displayOrder: 0,
  isPopular: false,
  isActive: true,
};

const Field = ({ label, children, wide = false }) => (
  <label className={`text-sm font-semibold text-slate-700 ${wide ? "md:col-span-2" : ""}`}>
    {label}
    {children}
  </label>
);

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const AdminDeclarationForms = () => {
  const [forms, setForms] = useState(null);
  const [editor, setEditor] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setError("");
    try {
      const response = await getAdminDeclarationForms();
      setForms(response.forms);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load declaration forms.");
    }
  };

  useEffect(() => {
    let current = true;
    getAdminDeclarationForms()
      .then((response) => {
        if (current) setForms(response.forms);
      })
      .catch((requestError) => {
        if (current) {
          setError(requestError.response?.data?.message || "Unable to load declaration forms.");
        }
      });
    return () => {
      current = false;
    };
  }, []);

  const startCreate = () => setEditor({ id: null, values: { ...emptyForm } });
  const startEdit = (form) => setEditor({
    id: form._id,
    values: Object.fromEntries(
      Object.keys(emptyForm).map((key) => [key, form[key] ?? emptyForm[key]]),
    ),
  });
  const change = (key, value) => setEditor((current) => ({
    ...current,
    values: { ...current.values, [key]: value },
  }));
  const toggleAudience = (role) => {
    const current = editor.values.visibleTo;
    change(
      "visibleTo",
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const payload = {
        ...editor.values,
        displayOrder: Number(editor.values.displayOrder),
      };
      if (editor.id) await updateAdminDeclarationForm(editor.id, payload);
      else await createAdminDeclarationForm(payload);
      setFeedback(`Declaration form ${editor.id ? "updated" : "created"}.`);
      setEditor(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save declaration form.");
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (form, key) => {
    setBusy(true);
    setError("");
    try {
      await updateAdminDeclarationForm(form._id, { [key]: !form[key] });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update declaration form.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteAdminDeclarationForm(deleteTarget._id);
      setFeedback("Metadata deleted. The Cloudinary PDF was not changed.");
      setDeleteTarget(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete declaration form.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Metadata management</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Declaration Forms</h1>
          <p className="mt-1 text-slate-500">Connect existing Cloudinary PDFs without uploading or deleting files.</p>
        </div>
        <button type="button" onClick={startCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
          <Plus size={18} /> Add metadata
        </button>
      </header>

      {feedback && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{feedback}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

      {editor && (
        <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm" aria-labelledby="declaration-editor-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="declaration-editor-title" className="text-xl font-bold">{editor.id ? "Edit metadata" : "Add declaration form metadata"}</h2>
            <button type="button" onClick={() => setEditor(null)} aria-label="Close metadata editor" className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button>
          </div>
          <form onSubmit={save} className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <input required maxLength="180" value={editor.values.title} onChange={(event) => change("title", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Slug (optional; generated from title)">
              <input pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={editor.values.slug} onChange={(event) => change("slug", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Category">
              <input required maxLength="100" value={editor.values.category} onChange={(event) => change("category", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Language">
              <input required maxLength="80" value={editor.values.language} onChange={(event) => change("language", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Cloudinary public ID">
              <input required maxLength="500" value={editor.values.publicId} onChange={(event) => change("publicId", event.target.value)} className={inputClass} />
            </Field>
            <Field label="PDF file name">
              <input required maxLength="240" pattern=".*\.pdf$" value={editor.values.fileName} onChange={(event) => change("fileName", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Cloudinary HTTPS URL" wide>
              <input required type="url" pattern="https://.*" value={editor.values.fileUrl} onChange={(event) => change("fileUrl", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Description" wide>
              <textarea rows="3" maxLength="1000" value={editor.values.description} onChange={(event) => change("description", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Display order">
              <input required min="0" type="number" value={editor.values.displayOrder} onChange={(event) => change("displayOrder", event.target.value)} className={inputClass} />
            </Field>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-slate-700">Visibility</legend>
              <div className="flex gap-5">
                {["customer", "partner"].map((role) => (
                  <label key={role} className="inline-flex items-center gap-2 text-sm capitalize">
                    <input type="checkbox" checked={editor.values.visibleTo.includes(role)} onChange={() => toggleAudience(role)} />
                    {role}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-5 md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={editor.values.isPopular} onChange={(event) => change("isPopular", event.target.checked)} /> Popular</label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={editor.values.isActive} onChange={(event) => change("isActive", event.target.checked)} /> Active</label>
            </div>
            <div className="flex justify-end gap-3 md:col-span-2">
              <button type="button" onClick={() => setEditor(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cancel</button>
              <button disabled={busy || !editor.values.visibleTo.length} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save metadata"}</button>
            </div>
          </form>
        </section>
      )}

      {!forms ? (
        <LoadingSkeleton count={6} />
      ) : !forms.length ? (
        <EmptyState title="No declaration forms" description="Add metadata for a PDF that already exists in Cloudinary." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="p-4">Form</th><th className="p-4">Category</th><th className="p-4">Visible to</th><th className="p-4">Order</th><th className="p-4">Downloads</th><th className="p-4">Status</th><th className="p-4"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {forms.map((form) => (
                <tr key={form._id} className={!form.isActive ? "bg-slate-50 text-slate-500" : ""}>
                  <td className="p-4"><p className="font-bold">{form.title}</p><p className="mt-1 max-w-xs truncate text-xs text-slate-500">{form.fileName}</p></td>
                  <td className="p-4">{form.category}<p className="text-xs text-slate-500">{form.language}</p></td>
                  <td className="p-4 capitalize">{form.visibleTo.join(", ")}</td>
                  <td className="p-4">{form.displayOrder}</td>
                  <td className="p-4">{form.downloadCount.toLocaleString()}</td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      <button type="button" disabled={busy} onClick={() => toggleStatus(form, "isActive")} className={`rounded-full px-2.5 py-1 text-xs font-bold ${form.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{form.isActive ? "Active" : "Inactive"}</button>
                      <button type="button" disabled={busy} onClick={() => toggleStatus(form, "isPopular")} className={`inline-flex items-center gap-1 text-xs font-semibold ${form.isPopular ? "text-amber-700" : "text-slate-400"}`}><Star size={13} fill={form.isPopular ? "currentColor" : "none"} /> Popular</button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => startEdit(form)} className="rounded-lg border border-slate-300 p-2 text-blue-700 hover:bg-blue-50" aria-label={`Edit ${form.title}`}><FilePenLine size={17} /></button>
                      <button type="button" onClick={() => setDeleteTarget(form)} className="rounded-lg border border-slate-300 p-2 text-rose-700 hover:bg-rose-50" aria-label={`Delete ${form.title} metadata`}><Trash2 size={17} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete declaration metadata?"
        description={`This removes “${deleteTarget?.title || ""}” from MongoDB only. Its Cloudinary PDF will remain untouched.`}
        confirmLabel="Delete metadata"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AdminDeclarationForms;
