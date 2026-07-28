import {
  Download,
  Eye,
  FilePenLine,
  FileUp,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createAdminDeclarationForm,
  deleteAdminDeclarationForm,
  downloadAdminDeclarationForm,
  getAdminDeclarationForms,
  previewAdminDeclarationForm,
  replaceAdminDeclarationFormPdf,
  updateAdminDeclarationForm,
} from "../../api/declarationFormsApi";
import PdfPreviewDialog from "../../components/declarations/PdfPreviewDialog";
import ConfirmDialog from "../../components/dashboard/ConfirmDialog";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import { blobErrorMessage, saveBlob } from "../../utils/fileDownload";

const categories = [
  "Identity",
  "Aadhaar",
  "PAN",
  "Tax",
  "Income",
  "Passport",
  "Education",
  "Certificates",
  "Property",
  "Banking",
  "Driving Licence",
  "Other",
];
const languages = ["English", "Hindi", "Bilingual"];
const maximumPdfSize = 10 * 1024 * 1024;
const emptyForm = {
  title: "",
  slug: "",
  category: "",
  description: "",
  language: "English",
  visibleTo: ["customer", "partner"],
  displayOrder: 0,
  isPopular: false,
  isActive: true,
};

const slugify = (value) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const validatePdf = (file) => {
  if (!file) return "Declaration PDF is required.";
  if (file.type !== "application/pdf") return "Only PDF files are allowed.";
  if (file.size > maximumPdfSize) return "PDF must be smaller than 10 MB.";
  return "";
};

const buildFormData = (values, file) => {
  const data = new FormData();
  data.append("title", values.title);
  data.append("slug", values.slug);
  data.append("category", values.category);
  data.append("language", values.language);
  data.append("description", values.description || "");
  data.append("displayOrder", String(values.displayOrder));
  data.append("visibleTo", JSON.stringify(values.visibleTo));
  data.append("isPopular", String(values.isPopular));
  data.append("isActive", String(values.isActive));
  data.append("declarationFile", file);
  return data;
};

const Field = ({ label, children, wide = false }) => (
  <label className={`text-sm font-semibold text-slate-700 ${wide ? "md:col-span-2" : ""}`}>
    {label}
    {children}
  </label>
);

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const AdminDeclarationForms = () => {
  const fileInputRef = useRef(null);
  const replacementInputRef = useRef(null);
  const [forms, setForms] = useState(null);
  const [editor, setEditor] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [replacement, setReplacement] = useState(null);
  const [replacementFile, setReplacementFile] = useState(null);
  const [replacementError, setReplacementError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [popularFilter, setPopularFilter] = useState("");
  const [sort, setSort] = useState("display-order");
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [downloading, setDownloading] = useState("");

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
        if (current) setError(requestError.response?.data?.message || "Unable to load declaration forms.");
      });
    return () => {
      current = false;
    };
  }, []);

  const visibleForms = useMemo(() => (forms || []).filter((form) => {
    const query = search.trim().toLowerCase();
    return (!query || [form.title, form.category, form.language]
      .some((value) => String(value || "").toLowerCase().includes(query)))
      && (!categoryFilter || form.category === categoryFilter)
      && (!languageFilter || form.language === languageFilter)
      && (!visibilityFilter || form.visibleTo.includes(visibilityFilter))
      && (!statusFilter || String(form.isActive) === statusFilter)
      && (!popularFilter || String(form.isPopular) === popularFilter);
  }).sort((left, right) => {
    if (sort === "newest") return new Date(right.createdAt) - new Date(left.createdAt);
    if (sort === "oldest") return new Date(left.createdAt) - new Date(right.createdAt);
    if (sort === "most-downloaded") return (right.downloadCount || 0) - (left.downloadCount || 0);
    if (sort === "alphabetical") return left.title.localeCompare(right.title);
    return (left.displayOrder || 0) - (right.displayOrder || 0)
      || left.title.localeCompare(right.title);
  }), [
    forms,
    search,
    categoryFilter,
    languageFilter,
    visibilityFilter,
    statusFilter,
    popularFilter,
    sort,
  ]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const closeEditor = () => {
    setEditor(null);
    setSelectedFile(null);
    setFileError("");
    setUploadProgress(0);
  };
  const startCreate = () => {
    setError("");
    setEditor({ id: null, values: { ...emptyForm } });
    setSelectedFile(null);
    setFileError("");
  };
  const startEdit = (form) => {
    setError("");
    setEditor({
      id: form._id,
      values: Object.fromEntries(
        Object.keys(emptyForm).map((key) => [key, form[key] ?? emptyForm[key]]),
      ),
    });
    setSelectedFile(null);
    setFileError("");
  };
  const change = (key, value) => setEditor((current) => ({
    ...current,
    values: {
      ...current.values,
      [key]: value,
      ...(key === "title" ? { slug: slugify(value) } : {}),
    },
  }));
  const toggleAudience = (role) => {
    const current = editor.values.visibleTo;
    change("visibleTo", current.includes(role)
      ? current.filter((item) => item !== role)
      : [...current, role]);
  };
  const chooseFile = (event) => {
    const file = event.target.files?.[0] || null;
    const validationError = file ? validatePdf(file) : "";
    setSelectedFile(validationError ? null : file);
    setFileError(validationError);
    if (validationError) event.target.value = "";
  };
  const trackProgress = ({ loaded, total }) => {
    if (total) setUploadProgress(Math.round((loaded * 100) / total));
  };

  const save = async (event) => {
    event.preventDefault();
    if (!editor.id) {
      const validationError = validatePdf(selectedFile);
      if (validationError) {
        setFileError(validationError);
        return;
      }
    }
    if (!editor.values.visibleTo.length) {
      setError("Select at least one visibility option.");
      return;
    }
    setBusy(true);
    setError("");
    setFeedback("");
    setUploadProgress(0);
    try {
      if (editor.id) {
        await updateAdminDeclarationForm(editor.id, {
          ...editor.values,
          displayOrder: Number(editor.values.displayOrder),
        });
      } else {
        await createAdminDeclarationForm(
          buildFormData(editor.values, selectedFile),
          trackProgress,
        );
      }
      setFeedback(`Declaration form ${editor.id ? "updated" : "created"}.`);
      closeEditor();
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save declaration form.");
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (form, key) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await updateAdminDeclarationForm(form._id, { [key]: !form[key] });
      setFeedback(`${form.title} ${key === "isActive" ? (form.isActive ? "deactivated" : "activated") : "updated"}.`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update declaration form.");
    } finally {
      setBusy(false);
    }
  };

  const openReplacement = (form) => {
    setReplacement(form);
    setReplacementFile(null);
    setReplacementError("");
    setUploadProgress(0);
  };
  const chooseReplacement = (event) => {
    const file = event.target.files?.[0] || null;
    const validationError = file ? validatePdf(file) : "";
    setReplacementFile(validationError ? null : file);
    setReplacementError(validationError);
    if (validationError) event.target.value = "";
  };
  const replacePdf = async (event) => {
    event.preventDefault();
    const validationError = validatePdf(replacementFile);
    if (validationError) {
      setReplacementError(validationError);
      return;
    }
    setBusy(true);
    setError("");
    setFeedback("");
    setUploadProgress(0);
    const data = new FormData();
    data.append("declarationFile", replacementFile);
    try {
      await replaceAdminDeclarationFormPdf(replacement._id, data, trackProgress);
      setFeedback(`PDF replaced for ${replacement.title}.`);
      setReplacement(null);
      setReplacementFile(null);
      await load();
    } catch (requestError) {
      setReplacementError(requestError.response?.data?.message || "Failed to replace declaration PDF.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await deleteAdminDeclarationForm(deleteTarget._id);
      setFeedback("Declaration form deleted. Cloudinary cleanup was attempted.");
      setDeleteTarget(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete declaration form.");
    } finally {
      setBusy(false);
    }
  };

  const download = async (form) => {
    setDownloading(form._id);
    setError("");
    setFeedback("");
    try {
      const response = await downloadAdminDeclarationForm(form._id);
      saveBlob(response.data, form.fileName);
      setFeedback(`${form.title} downloaded successfully.`);
      await load();
    } catch (requestError) {
      setError(await blobErrorMessage(requestError, "Unable to download this form."));
    } finally {
      setDownloading("");
    }
  };

  const closePreview = () => {
    setPreview(null);
    setPreviewError("");
    setPreviewLoading(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  };

  const openPreview = async (form) => {
    setPreview(form);
    setPreviewLoading(true);
    setPreviewError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    try {
      const response = await previewAdminDeclarationForm(form._id);
      setPreviewUrl(URL.createObjectURL(response.data));
    } catch (requestError) {
      setPreviewError(await blobErrorMessage(requestError, "Unable to preview this PDF."));
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Document management</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Declaration Forms</h1>
          <p className="mt-1 text-slate-500">Upload and manage declaration PDFs for customer and partner dashboards.</p>
        </div>
        <button type="button" disabled={busy} onClick={startCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
          <Plus size={18} /> Add declaration form
        </button>
      </header>

      {feedback && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{feedback}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

      {editor && (
        <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm" aria-labelledby="declaration-editor-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="declaration-editor-title" className="text-xl font-bold">{editor.id ? "Edit declaration form" : "Create declaration form"}</h2>
            <button type="button" disabled={busy} onClick={closeEditor} aria-label="Close declaration form editor" className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button>
          </div>
          <form onSubmit={save} className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <input required maxLength="180" value={editor.values.title} onChange={(event) => change("title", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Slug (generated from title)">
              <input readOnly value={editor.values.slug} className={`${inputClass} bg-slate-50 text-slate-500`} />
            </Field>
            <Field label="Category">
              <select required value={editor.values.category} onChange={(event) => change("category", event.target.value)} className={inputClass}>
                <option value="">Select a category</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="Language">
              <select required value={editor.values.language} onChange={(event) => change("language", event.target.value)} className={inputClass}>
                {languages.map((language) => <option key={language}>{language}</option>)}
              </select>
            </Field>
            <Field label="Description" wide>
              <textarea rows="3" maxLength="1000" value={editor.values.description} onChange={(event) => change("description", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Display order">
              <input required min="0" step="1" type="number" value={editor.values.displayOrder} onChange={(event) => change("displayOrder", event.target.value)} className={inputClass} />
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
            {!editor.id && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Declaration PDF
                  <input ref={fileInputRef} required accept="application/pdf,.pdf" type="file" onChange={chooseFile} className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700" />
                </label>
                <p className="mt-1.5 text-xs text-slate-500">PDF only, up to 10 MB.</p>
                {selectedFile && <p className="mt-1 text-sm text-emerald-700">Selected: {selectedFile.name}</p>}
                {fileError && <p role="alert" className="mt-1 text-sm text-rose-700">{fileError}</p>}
              </div>
            )}
            <div className="flex flex-wrap gap-5 md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={editor.values.isPopular} onChange={(event) => change("isPopular", event.target.checked)} /> Popular</label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={editor.values.isActive} onChange={(event) => change("isActive", event.target.checked)} /> Active</label>
            </div>
            {busy && !editor.id && uploadProgress > 0 && (
              <div className="md:col-span-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-700 transition-all" style={{ width: `${uploadProgress}%` }} /></div>
                <p className="mt-1 text-xs text-slate-500">Uploading {uploadProgress}%</p>
              </div>
            )}
            <div className="flex justify-end gap-3 md:col-span-2">
              <button type="button" disabled={busy} onClick={closeEditor} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Cancel</button>
              <button disabled={busy || !editor.values.visibleTo.length} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? (editor.id ? "Saving…" : "Uploading…") : (editor.id ? "Save changes" : "Save declaration form")}
              </button>
            </div>
          </form>
        </section>
      )}

      <section aria-label="Declaration form filters" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <label className="relative">
          <span className="sr-only">Search by title, category, or language</span>
          <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, category, language" className={`${inputClass} mt-0 pl-10`} />
        </label>
        <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={`${inputClass} mt-0`}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category}>{category}</option>)}
        </select>
        <select aria-label="Filter by language" value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)} className={`${inputClass} mt-0`}>
          <option value="">All languages</option>
          {languages.map((language) => <option key={language}>{language}</option>)}
        </select>
        <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${inputClass} mt-0`}>
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select aria-label="Filter by visibility" value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)} className={`${inputClass} mt-0`}>
          <option value="">All visibility</option>
          <option value="customer">Customer</option>
          <option value="partner">Partner</option>
        </select>
        <select aria-label="Filter by popularity" value={popularFilter} onChange={(event) => setPopularFilter(event.target.value)} className={`${inputClass} mt-0`}>
          <option value="">All popularity</option>
          <option value="true">Popular</option>
          <option value="false">Not popular</option>
        </select>
        <select aria-label="Sort declaration forms" value={sort} onChange={(event) => setSort(event.target.value)} className={`${inputClass} mt-0`}>
          <option value="display-order">Display order</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most-downloaded">Most downloaded</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setCategoryFilter("");
            setLanguageFilter("");
            setVisibilityFilter("");
            setStatusFilter("");
            setPopularFilter("");
            setSort("display-order");
          }}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Clear filters
        </button>
      </section>

      {!forms ? (
        <LoadingSkeleton count={6} />
      ) : !visibleForms.length ? (
        <EmptyState title="No declaration forms found" description={forms.length ? "Try changing the search or filters." : "Upload the first declaration PDF from the admin panel."} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="p-4">Title</th><th className="p-4">Category</th><th className="p-4">Language</th><th className="p-4">Visibility</th><th className="p-4">Downloads</th><th className="p-4">Status</th><th className="p-4">Updated</th><th className="p-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleForms.map((form) => (
                <tr key={form._id} className={!form.isActive ? "bg-slate-50 text-slate-500" : ""}>
                  <td className="p-4"><p className="font-bold">{form.title}</p>{form.isPopular && <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><Star size={12} fill="currentColor" /> Popular</span>}</td>
                  <td className="p-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{form.category}</span></td>
                  <td className="p-4">{form.language}</td>
                  <td className="p-4"><div className="flex flex-wrap gap-1">{form.visibleTo.map((role) => <span key={role} className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold capitalize text-violet-700">{role}</span>)}</div></td>
                  <td className="p-4">{Number(form.downloadCount || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <button type="button" disabled={busy} onClick={() => toggleStatus(form, "isActive")} className={`rounded-full px-2.5 py-1 text-xs font-bold disabled:opacity-50 ${form.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{form.isActive ? "Active" : "Inactive"}</button>
                  </td>
                  <td className="p-4 whitespace-nowrap">{form.updatedAt ? new Date(form.updatedAt).toLocaleDateString() : "—"}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openPreview(form)} className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50" aria-label={`Preview ${form.title}`} title="Preview"><Eye size={17} /></button>
                      <button type="button" disabled={downloading === form._id} onClick={() => download(form)} className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50" aria-label={`Download ${form.title}`} title="Download"><Download size={17} /></button>
                      <button type="button" disabled={busy} onClick={() => openReplacement(form)} className="rounded-lg border border-slate-300 p-2 text-violet-700 hover:bg-violet-50 disabled:opacity-50" aria-label={`Replace PDF for ${form.title}`} title="Replace PDF"><FileUp size={17} /></button>
                      <button type="button" disabled={busy} onClick={() => startEdit(form)} className="rounded-lg border border-slate-300 p-2 text-blue-700 hover:bg-blue-50 disabled:opacity-50" aria-label={`Edit ${form.title}`} title="Edit"><FilePenLine size={17} /></button>
                      <button type="button" disabled={busy} onClick={() => toggleStatus(form, "isPopular")} className={`rounded-lg border border-slate-300 p-2 hover:bg-amber-50 disabled:opacity-50 ${form.isPopular ? "text-amber-700" : "text-slate-400"}`} aria-label={`Toggle popular for ${form.title}`}><Star size={17} fill={form.isPopular ? "currentColor" : "none"} /></button>
                      <button type="button" disabled={busy} onClick={() => setDeleteTarget(form)} className="rounded-lg border border-slate-300 p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50" aria-label={`Delete ${form.title}`}><Trash2 size={17} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {replacement && (
        <div role="dialog" aria-modal="true" aria-labelledby="replace-pdf-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <form onSubmit={replacePdf} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="replace-pdf-title" className="text-xl font-bold">Replace PDF</h2><p className="mt-1 text-sm text-slate-500">{replacement.title}</p></div>
              <button type="button" disabled={busy} onClick={() => setReplacement(null)} aria-label="Close replace PDF dialog" className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button>
            </div>
            <label className="mt-5 block text-sm font-semibold text-slate-700">
              New declaration PDF
              <input ref={replacementInputRef} required accept="application/pdf,.pdf" type="file" onChange={chooseReplacement} className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <p className="mt-1.5 text-xs text-slate-500">PDF only, up to 10 MB. Metadata and download count will be preserved.</p>
            {replacementFile && <p className="mt-2 text-sm text-emerald-700">Selected: {replacementFile.name}</p>}
            {replacementError && <p role="alert" className="mt-2 text-sm text-rose-700">{replacementError}</p>}
            {busy && uploadProgress > 0 && <div className="mt-4"><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-violet-700" style={{ width: `${uploadProgress}%` }} /></div><p className="mt-1 text-xs text-slate-500">Uploading {uploadProgress}%</p></div>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={busy} onClick={() => setReplacement(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Cancel</button>
              <button disabled={busy} className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Replacing…" : "Replace PDF"}</button>
            </div>
          </form>
        </div>
      )}

      {preview && (
        <PdfPreviewDialog
          title={preview.title}
          fileName={preview.fileName}
          url={previewUrl}
          loading={previewLoading}
          error={previewError}
          downloading={downloading === preview._id}
          onClose={closePreview}
          onDownload={() => download(preview)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete declaration form?"
        description={`This permanently deletes “${deleteTarget?.title || ""}” and attempts to remove its Cloudinary PDF. Deactivation is safer for routine use.`}
        confirmLabel="Delete permanently"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AdminDeclarationForms;
