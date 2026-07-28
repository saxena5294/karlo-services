import { Download, LoaderCircle, X } from "lucide-react";

const PdfPreviewDialog = ({
  title,
  fileName,
  url,
  loading = false,
  error = "",
  downloading = false,
  onClose,
  onDownload,
}) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="declaration-preview-title"
    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
  >
    <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <h2 id="declaration-preview-title" className="truncate font-bold">{title}</h2>
          <p className="truncate text-xs text-slate-500">{fileName}</p>
        </div>
        <button type="button" autoFocus onClick={onClose} aria-label="Close PDF preview" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
          <X size={21} />
        </button>
      </header>

      <div className="relative min-h-0 flex-1 bg-slate-100">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-600" role="status">
            <LoaderCircle className="mr-2 animate-spin" size={20} /> Loading PDF preview…
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p role="alert" className="max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-800">{error}</p>
          </div>
        )}
        {url && <iframe title={`${title} PDF preview`} src={url} className="h-full w-full bg-slate-100" />}
      </div>

      <footer className="flex justify-end border-t border-slate-200 p-3">
        <button type="button" disabled={downloading} onClick={onDownload} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
          <Download size={17} /> {downloading ? "Saving…" : "Download PDF"}
        </button>
      </footer>
    </div>
  </div>
);

export default PdfPreviewDialog;
