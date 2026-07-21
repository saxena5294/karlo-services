import { Download, Expand, Eye, FileText, RefreshCw, Upload, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getApplicationDocuments, getDocumentDownload, getDocumentPreview, updateDocumentVerification, uploadDocumentReplacement } from "../../api/documentApi";
import { formatDate, formatFileSize } from "../../utils/dashboardFormatters";

const statusStyle = {
  pending: "bg-amber-50 text-amber-800",
  verified: "bg-emerald-50 text-emerald-800",
  rejected: "bg-rose-50 text-rose-800",
  reupload_required: "bg-violet-50 text-violet-800",
};
const supported = (document) => ["image/jpeg", "image/png", "application/pdf"].includes(document.mimeType) || ["jpg", "jpeg", "png", "pdf"].includes(document.extension);
const isPdf = (document) => document.mimeType === "application/pdf" || document.extension === "pdf";

const DocumentViewer = ({ applicationId, title = "Application documents" }) => {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [review, setReview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});

  const load = useCallback(async () => {
    setError("");
    try { setDocuments((await getApplicationDocuments(applicationId)).documents); }
    catch (requestError) { setError(requestError.response?.status === 403 ? "You do not have permission to view these documents." : requestError.response?.data?.message || "Unable to load documents."); }
  }, [applicationId]);

  useEffect(() => {
    let active = true;
    getApplicationDocuments(applicationId)
      .then((result) => { if (active) setDocuments(result.documents); })
      .catch((requestError) => { if (active) setError(requestError.response?.status === 403 ? "You do not have permission to view these documents." : requestError.response?.data?.message || "Unable to load documents."); });
    return () => { active = false; };
  }, [applicationId]);

  const openPreview = async (document) => {
    if (!supported(document)) { setFeedback("This file type cannot be previewed safely."); return; }
    setPreview({ document, url: "", expiresAt: "" }); setPreviewBusy(true); setPreviewError("");
    try { const result = await getDocumentPreview(applicationId, document.id); setPreview({ document: result.document, url: result.url, expiresAt: result.expiresAt }); }
    catch (requestError) { setPreviewError(requestError.response?.data?.message || "Preview could not be loaded."); }
    finally { setPreviewBusy(false); }
  };

  const download = async (document) => {
    setBusyId(document.id); setFeedback("");
    try {
      const result = await getDocumentDownload(applicationId, document.id);
      const anchor = window.document.createElement("a"); anchor.href = result.url; anchor.rel = "noopener"; anchor.click();
    } catch (requestError) { setFeedback(requestError.response?.data?.message || "Download failed. Please try again."); }
    finally { setBusyId(""); }
  };

  const submitReview = async () => {
    if (!review || (["rejected", "reupload_required"].includes(review.status) && !review.remark.trim())) return;
    setBusyId(review.id); setFeedback("");
    try { await updateDocumentVerification(applicationId, review.id, { status: review.status, remark: review.remark.trim() }); setFeedback("Document review updated."); setReview(null); await load(); }
    catch (requestError) { setFeedback(requestError.response?.data?.message || "Document review failed."); }
    finally { setBusyId(""); }
  };

  const replace = async (document, file) => {
    if (!file) return;
    setBusyId(document.id); setFeedback(""); setUploadProgress((current) => ({ ...current, [document.id]: 0 }));
    try {
      await uploadDocumentReplacement(applicationId, document.id, file, ({ loaded, total }) => setUploadProgress((current) => ({ ...current, [document.id]: total ? Math.round((loaded / total) * 100) : 0 })));
      setFeedback("Replacement uploaded and queued for review."); await load();
    } catch (requestError) { setFeedback(requestError.response?.data?.message || "Replacement upload failed."); }
    finally { setBusyId(""); }
  };

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">Files open only after the server confirms your access.</p></div><button type="button" onClick={load} aria-label="Refresh documents" className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"><RefreshCw size={18} /></button></div>
    {feedback && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900" role="status">{feedback}</p>}
    {error ? <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}<button type="button" onClick={load} className="ml-2 font-bold underline">Retry</button></div>
      : documents === null ? <div className="mt-5 space-y-3" aria-label="Loading documents">{[1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}</div>
        : !documents.length ? <p className="mt-4 text-sm text-slate-500">No documents are available for this application.</p>
          : <div className="mt-5 grid gap-4 lg:grid-cols-2">{documents.map((document) => <article key={document.id} className={`rounded-xl border p-4 ${document.isCurrent ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-75"}`}>
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><FileText size={20} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="font-bold text-slate-900">{document.label}</p><p className="truncate text-sm text-slate-600">{document.originalName}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[document.verificationStatus] || "bg-slate-100 text-slate-700"}`}>{document.verificationStatus.replaceAll("_", " ")}</span></div><p className="mt-2 text-xs text-slate-500">{document.extension?.toUpperCase() || "FILE"} · {formatFileSize(document.size)} · {document.source} · {document.uploadedAt ? formatDate(document.uploadedAt) : "Legacy upload"}</p></div></div>
            {document.verificationRemark && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>Review remark:</strong> {document.verificationRemark}</p>}
            {document.replacementRequested && <p className="mt-3 text-sm font-semibold text-violet-800">A replacement has been requested for this document.</p>}
            <div className="mt-4 flex flex-wrap gap-2">{document.canPreview && <button type="button" onClick={() => openPreview(document)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold text-blue-700"><Eye size={16} /> Preview</button>}{document.canDownload && <button type="button" disabled={busyId === document.id} onClick={() => download(document)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><Download size={16} /> Download</button>}{document.canVerify && <><button type="button" onClick={() => setReview({ id: document.id, status: "verified", remark: "" })} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Verify</button><button type="button" onClick={() => setReview({ id: document.id, status: "rejected", remark: "" })} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700">Reject</button></>}{document.canRequestReupload && <button type="button" onClick={() => setReview({ id: document.id, status: "reupload_required", remark: "" })} className="rounded-lg border border-violet-300 px-3 py-2 text-sm font-semibold text-violet-700">Request re-upload</button>}{document.canReplace && <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white"><Upload size={16} /> Upload replacement<input type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" onChange={(event) => replace(document, event.target.files?.[0])} /></label>}</div>
            {busyId === document.id && uploadProgress[document.id] !== undefined && <div className="mt-3"><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-violet-600" style={{ width: `${uploadProgress[document.id]}%` }} /></div><p className="mt-1 text-xs text-slate-500">Uploading {uploadProgress[document.id]}%</p></div>}
            {review?.id === document.id && <div className="mt-4 rounded-xl border bg-slate-50 p-3"><label className="text-sm font-semibold">Verification remark<textarea rows="3" maxLength="1000" value={review.remark} onChange={(event) => setReview({ ...review, remark: event.target.value })} className="mt-2 w-full rounded-lg border bg-white p-2" placeholder={review.status === "verified" ? "Optional remark" : "Required explanation"} /></label><div className="mt-2 flex gap-2"><button type="button" disabled={busyId === document.id || (["rejected", "reupload_required"].includes(review.status) && !review.remark.trim())} onClick={submitReview} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirm</button><button type="button" onClick={() => setReview(null)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button></div></div>}
          </article>)}</div>}
    {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Preview ${preview.document.originalName}`}><div className="flex h-full max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white"><header className="flex items-center justify-between gap-3 border-b p-3"><div className="min-w-0"><p className="truncate font-bold">{preview.document.originalName}</p><p className="text-xs text-slate-500">Access expires {preview.expiresAt ? formatDate(preview.expiresAt) : "shortly"}</p></div><div className="flex gap-2">{preview.url && <a href={preview.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-blue-700" aria-label="Open full screen"><Expand size={20} /></a>}<button type="button" onClick={() => setPreview(null)} className="rounded-lg p-2" aria-label="Close preview"><X size={20} /></button></div></header><div className="flex min-h-0 flex-1 items-center justify-center bg-slate-100 p-2">{previewBusy ? <p className="text-slate-600">Loading secure preview…</p> : previewError ? <div className="text-center"><p className="text-rose-700">{previewError}</p><button type="button" onClick={() => openPreview(preview.document)} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-white">Retry authorization</button></div> : isPdf(preview.document) ? <iframe title={preview.document.originalName} src={preview.url} className="h-full w-full rounded-lg bg-white" /> : <img src={preview.url} alt={`Preview of ${preview.document.originalName}`} className="max-h-full max-w-full object-contain" loading="lazy" onError={() => setPreviewError("The preview link expired or could not be loaded. Retry authorization.")} />}</div></div></div>}
  </section>;
};

export default DocumentViewer;
