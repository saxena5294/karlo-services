import { Download, Eye, FileText, RotateCw, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  downloadDeclarationForm,
  getDeclarationForms,
} from "../../api/declarationFormsApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";

const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const DeclarationFormsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [language, setLanguage] = useState(searchParams.get("language") || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [downloading, setDownloading] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let current = true;
    const timer = window.setTimeout(() => {
      const params = Object.fromEntries(
        Object.entries({ search, category, language }).filter(([, value]) => value),
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
  }, [search, category, language, refresh, setSearchParams]);

  useEffect(() => {
    if (!preview) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preview]);

  const download = async (form) => {
    setDownloading(form._id);
    setError("");
    try {
      const response = await downloadDeclarationForm(form._id);
      saveBlob(response.data, form.fileName);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to download this form.");
    } finally {
      setDownloading("");
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

      <section aria-label="Declaration form filters" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
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
          action={(search || category || language) && (
            <button type="button" onClick={() => { setSearch(""); setCategory(""); setLanguage(""); }} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">
              Clear filters
            </button>
          )}
        />
      ) : (
        <section aria-live="polite">
          <p className="mb-3 text-sm text-slate-500">{result.pagination.total} form{result.pagination.total === 1 ? "" : "s"} found</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.forms.map((form) => (
              <article key={form._id} className="flex min-h-64 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-xl bg-blue-50 p-3 text-blue-700"><FileText size={24} /></span>
                  {form.isPopular && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Popular</span>}
                </div>
                <h2 className="mt-4 text-lg font-bold">{form.title}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">{form.category} · {form.language}</p>
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{form.description || "Approved declaration form."}</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPreview(form)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold hover:bg-slate-50">
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
        <div role="dialog" aria-modal="true" aria-labelledby="declaration-preview-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6">
          <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <h2 id="declaration-preview-title" className="truncate font-bold">{preview.title}</h2>
                <p className="truncate text-xs text-slate-500">{preview.fileName}</p>
              </div>
              <button type="button" autoFocus onClick={() => setPreview(null)} aria-label="Close PDF preview" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
                <X size={21} />
              </button>
            </header>
            <iframe title={`${preview.title} PDF preview`} src={preview.fileUrl} className="min-h-0 flex-1 bg-slate-100" />
            <footer className="flex justify-end border-t border-slate-200 p-3">
              <button type="button" onClick={() => download(preview)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">
                <Download size={17} /> Download PDF
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeclarationFormsPage;
