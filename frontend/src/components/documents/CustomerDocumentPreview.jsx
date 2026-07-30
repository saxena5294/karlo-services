import { Download, ExternalLink, X } from "lucide-react";
import { useEffect } from "react";

const CustomerDocumentPreview = ({ preview, onClose, onDownload }) => {
  useEffect(() => {
    const close = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  if (!preview) return null;
  const isPdf = preview.document.mimeType === "application/pdf";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Preview ${preview.document.documentName}`}>
    <div className="flex h-full max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white">
      <header className="flex items-center justify-between gap-3 border-b p-4">
        <div className="min-w-0"><h3 className="truncate font-bold">{preview.document.documentName}</h3><p className="truncate text-xs text-slate-500">{preview.document.originalFileName}</p></div>
        <div className="flex gap-1">
          <button type="button" onClick={() => onDownload(preview.document)} className="rounded-lg p-2 text-blue-700" aria-label="Download document"><Download size={20} /></button>
          <a href={preview.access.url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-blue-700" aria-label="Open preview in new tab"><ExternalLink size={20} /></a>
          <button type="button" onClick={onClose} className="rounded-lg p-2" aria-label="Close preview"><X size={20} /></button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-100 p-2">
        {isPdf ? <iframe title={preview.document.documentName} src={preview.access.url} className="h-full w-full rounded-lg bg-white" /> : <img src={preview.access.url} alt={`Preview of ${preview.document.documentName}`} className="max-h-full max-w-full object-contain" />}
      </div>
    </div>
  </div>;
};

export default CustomerDocumentPreview;
