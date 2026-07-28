import { Download, Eye, FileText, RotateCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  downloadDeclarationForm,
  getDeclarationForms,
  previewDeclarationForm,
} from "../../api/declarationFormsApi";
import PdfPreviewDialog from "../../components/declarations/PdfPreviewDialog";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import { blobErrorMessage, saveBlob } from "../../utils/fileDownload";

const DeclarationFormsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [language, setLanguage] = useState(searchParams.get("language") || "");
  const [popular, setPopular] = useState(searchParams.get("popular") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "display-order");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [success, setSuccess] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let current = true;
    const timer = window.setTimeout(() => {
      const params = Object.fromEntries(
        Object.entries({ search, category, language, popular }).filter(([, value]) => value),
      );
      setSearchParams(params, { replace: true });
      setLoading(true);
      setError("");
      getDeclarationForms({ ...params, limit: 100 })
        .then((response) => {
          if (current) setResult(response);
        })
        .catch((requestError) => {
          if (current) {
            setError(requestError.response?.data?.message || "Unable to load declaration forms.");
          }
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    }, 250);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [search, category, language, popular, refresh, setSearchParams]);

  useEffect(() => {
    if (!preview) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setPreview(null);
        setPreviewError("");
        setPreviewLoading(false);
        setPreviewUrl("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preview]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const sortedForms = useMemo(() => [...(result?.forms || [])].sort((left, right) => {
    if (sort === "newest") return new Date(right.createdAt) - new Date(left.createdAt);
    if (sort === "oldest") return new Date(left.createdAt) - new Date(right.createdAt);
    if (sort === "most-downloaded") return (right.downloadCount || 0) - (left.downloadCount || 0);
    if (sort === "alphabetical") return left.title.localeCompare(right.title);
    return (left.displayOrder || 0) - (right.displayOrder || 0)
      || left.title.localeCompare(right.title);
  }), [result, sort]);

  const download = async (form) => {
    setDownloading(form._id);
    setError("");
    try {
      const response = await downloadDeclarationForm(form._id);
      saveBlob(response.data, form.fileName);
      setSuccess(`${form.title} downloaded successfully.`);
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
      const response = await previewDeclarationForm(form._id);
      setPreviewUrl(URL.createObjectURL(response.data));
    } catch (requestError) {
      setPreviewError(await blobErrorMessage(requestError, "Unable to preview this PDF."));
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Resource library</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Declaration Forms</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Search, preview, and download approved declaration forms.
        </p>
      </header>

      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}

      <section aria-label="Declaration form filters" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
        <label className="relative">
          <span className="sr-only">Search declaration forms</span>
          <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={19} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search forms"
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label>
          <span className="sr-only">Filter by category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            <option value="">All categories</option>
            {(result?.filters.categories || []).map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by language</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            <option value="">All languages</option>
            {(result?.filters.languages || []).map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by popularity</span>
          <select value={popular} onChange={(event) => setPopular(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            <option value="">All forms</option>
            <option value="true">Popular</option>
            <option value="false">Not popular</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort declaration forms</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            <option value="display-order">Display order</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="most-downloaded">Most downloaded</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </label>
      </section>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => setRefresh((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 font-semibold">
            <RotateCw size={16} /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={6} />
      ) : !result?.forms.length ? (
        <EmptyState
          title="No declaration forms found"
          description="Try a different search, category, or language."
          action={(search || category || language || popular) && (
            <button type="button" onClick={() => { setSearch(""); setCategory(""); setLanguage(""); setPopular(""); }} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">
              Clear filters
            </button>
          )}
        />
      ) : (
        <section aria-live="polite">
          <p className="mb-3 text-sm text-slate-500">{result.pagination.total} form{result.pagination.total === 1 ? "" : "s"} found</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedForms.map((form) => (
              <article key={form._id} className="flex min-h-64 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-xl bg-blue-50 p-3 text-blue-700"><FileText size={24} /></span>
                  {form.isPopular && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Popular</span>}
                </div>
                <h2 className="mt-4 text-lg font-bold">{form.title}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">{form.category} · {form.language}</p>
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{form.description || "Approved declaration form."}</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openPreview(form)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold hover:bg-slate-50">
                    <Eye size={17} /> Preview
                  </button>
                  <button type="button" disabled={downloading === form._id} onClick={() => download(form)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                    <Download size={17} /> {downloading === form._id ? "Saving…" : "Download"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
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
    </div>
  );
};

export default DeclarationFormsPage;
