import {
  Download,
  Eye,
  FileClock,
  FileText,
  Lock,
  LockOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  deleteCustomerDocument,
  downloadCustomerDocumentVersion,
  getCustomerDocumentDownload,
  getCustomerDocumentPreview,
  getCustomerDocuments,
  getCustomerDocumentTypes,
  getCustomerDocumentVersions,
  getMyCustomerDocuments,
  lockCustomerDocument,
  replaceCustomerDocument,
  restoreCustomerDocument,
  restoreCustomerDocumentVersion,
  unlockCustomerDocument,
  updateCustomerDocument,
  uploadCustomerDocument,
  verifyCustomerDocument,
} from "../../api/customerDocumentApi";
import { formatDate } from "../../utils/dashboardFormatters";
import ConfirmDialog from "../dashboard/ConfirmDialog";
import EmptyState from "../dashboard/EmptyState";
import LoadingSkeleton from "../dashboard/LoadingSkeleton";
import { ExpiryBadge, VerificationBadge } from "./CustomerDocumentBadges";
import CustomerDocumentPreview from "./CustomerDocumentPreview";

const formatSize = (bytes = 0) => bytes < 1024 * 1024
  ? `${Math.max(bytes / 1024, 0.1).toFixed(1)} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const initialUpload = {
  documentType: "",
  documentName: "",
  description: "",
  issueDate: "",
  expiryDate: "",
  applicationId: "",
  customerUserId: "",
  allowDuplicate: false,
  file: null,
};

const CustomerDocumentsManager = ({ mode = "customer", applicationId = null, compact = false }) => {
  const admin = mode === "admin";
  const customer = mode === "customer";
  const [configuration, setConfiguration] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({ search: "", customerUserId: "", applicationId: "", serviceId: "", documentType: "", verificationStatus: "", expiryStatus: "", dateFrom: "", dateTo: "", locked: "", deleted: "", sortBy: "createdAt", sortOrder: "desc", page: 1 });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [uploadForm, setUploadForm] = useState(initialUpload);
  const [showUpload, setShowUpload] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [versions, setVersions] = useState(null);
  const [review, setReview] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    getCustomerDocumentTypes()
      .then(setConfiguration)
      .catch((error) => setFeedback(error.response?.data?.message || "Unable to load document configuration."));
  }, []);

  const query = useMemo(() => Object.fromEntries(Object.entries({
    ...filters,
    search: debouncedSearch,
    applicationId: applicationId || filters.applicationId || undefined,
    limit: compact ? 10 : 12,
  }).filter(([, value]) => value !== "" && value !== undefined && value !== null)), [applicationId, compact, debouncedSearch, filters]);

  useEffect(() => {
    let active = true;
    const request = customer ? getMyCustomerDocuments(query) : getCustomerDocuments(query);
    request
      .then((response) => {
        if (!active) return;
        setDocuments(response.documents);
        setPagination(response.pagination);
      })
      .catch((error) => active && setFeedback(error.response?.data?.message || "Unable to load customer documents."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [customer, query, refresh]);

  const changeFilter = (name, value) => {
    setLoading(true);
    setFilters((current) => ({ ...current, [name]: value, page: 1 }));
  };

  const submitUpload = async (event) => {
    event.preventDefault();
    setBusy(true);
    setProgress(0);
    try {
      await uploadCustomerDocument({
        ...uploadForm,
        applicationId: uploadForm.applicationId || applicationId || "",
        allowDuplicate: String(uploadForm.allowDuplicate),
      }, (uploadEvent) => setProgress(Math.round((uploadEvent.loaded * 100) / (uploadEvent.total || 1))));
      setFeedback("Document uploaded securely.");
      setUploadForm(initialUpload);
      setShowUpload(false);
      setRefresh((value) => value + 1);
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to upload document.");
    } finally {
      setBusy(false);
    }
  };

  const openPreview = async (document) => {
    setBusy(true);
    try {
      setPreview(await getCustomerDocumentPreview(document._id, applicationId ? { applicationId } : {}));
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to authorize preview.");
    } finally { setBusy(false); }
  };

  const download = async (document) => {
    setBusy(true);
    try {
      const response = await getCustomerDocumentDownload(document._id, applicationId ? { applicationId } : {});
      window.open(response.access.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to authorize download.");
    } finally { setBusy(false); }
  };

  const replace = async (document, file) => {
    if (!file) return;
    const reason = window.prompt("Why is this document being replaced?");
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await replaceCustomerDocument(document._id, file, reason, (event) => setProgress(Math.round((event.loaded * 100) / (event.total || 1))));
      setFeedback("Document replaced. The previous version remains in history.");
      setRefresh((value) => value + 1);
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to replace document.");
    } finally { setBusy(false); }
  };

  const editMetadata = async (document) => {
    const documentName = window.prompt("Document name", document.documentName);
    if (!documentName?.trim()) return;
    const expiryDate = window.prompt("Expiry date (YYYY-MM-DD, blank for no expiry)", document.expiryDate ? String(document.expiryDate).slice(0, 10) : "");
    if (expiryDate === null) return;
    setBusy(true);
    try {
      await updateCustomerDocument(document._id, { documentName, expiryDate });
      setFeedback("Document details updated.");
      setRefresh((value) => value + 1);
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to update document details.");
    } finally { setBusy(false); }
  };

  const openVersions = async (document) => {
    setBusy(true);
    try {
      setVersions(await getCustomerDocumentVersions(document._id, applicationId ? { applicationId } : {}));
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to load version history.");
    } finally { setBusy(false); }
  };

  const downloadVersion = async (version) => {
    setBusy(true);
    try {
      const response = await downloadCustomerDocumentVersion(versions.document._id, version._id, applicationId ? { applicationId } : {});
      window.open(response.access.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to authorize version download.");
    } finally { setBusy(false); }
  };

  const submitReview = async () => {
    setBusy(true);
    try {
      await verifyCustomerDocument(review.document._id, {
        status: review.status,
        publicRemarks: review.publicRemarks,
        internalRemarks: review.internalRemarks,
        applicationId: applicationId || undefined,
      });
      setReview(null);
      setFeedback("Verification status updated.");
      setRefresh((value) => value + 1);
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to update verification.");
    } finally { setBusy(false); }
  };

  const toggleLock = async (document) => {
    const reason = window.prompt(document.isLocked ? "Reason for unlocking" : "Reason for locking");
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await (document.isLocked ? unlockCustomerDocument(document._id, reason) : lockCustomerDocument(document._id, reason));
      setFeedback(`Document ${document.isLocked ? "unlocked" : "locked"}.`);
      setRefresh((value) => value + 1);
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to change document lock.");
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await deleteCustomerDocument(pendingDelete._id);
      setFeedback("Document moved to deleted records. File history was retained.");
      setPendingDelete(null);
      setRefresh((value) => value + 1);
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to delete document.");
      setPendingDelete(null);
    } finally { setBusy(false); }
  };

  const restore = async (document) => {
    setBusy(true);
    try {
      await restoreCustomerDocument(document._id);
      setFeedback("Document restored.");
      setRefresh((value) => value + 1);
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to restore document.");
    } finally { setBusy(false); }
  };

  const restoreVersion = async (version) => {
    const reason = window.prompt(`Reason for restoring version ${version.versionNumber}`);
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await restoreCustomerDocumentVersion(versions.document._id, version._id, reason);
      setVersions(null);
      setFeedback("Historical version restored as a new current version.");
      setRefresh((value) => value + 1);
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to restore version.");
    } finally { setBusy(false); }
  };

  return <section className="space-y-5">
    {!compact && <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-bold">{admin ? "Customer document management" : "My documents"}</h2><p className="mt-1 text-slate-500">{admin ? "Securely review, verify, lock, restore, and audit customer files." : "Upload documents once, track verification, expiry, and version history."}</p></div>{(customer || admin) && <button type="button" onClick={() => setShowUpload((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"><Upload size={18} /> Upload document</button>}</div>}
    {feedback && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{feedback}</p>}
    {showUpload && configuration && <form onSubmit={submitUpload} className="grid gap-3 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-2">
      {admin && <label className="text-sm font-semibold">Customer user ID<input required value={uploadForm.customerUserId} onChange={(event) => setUploadForm({ ...uploadForm, customerUserId: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label>}
      <label className="text-sm font-semibold">Document type<select required value={uploadForm.documentType} onChange={(event) => setUploadForm({ ...uploadForm, documentType: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5"><option value="">Select type</option>{configuration.documentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
      <label className="text-sm font-semibold">Document name<input value={uploadForm.documentName} onChange={(event) => setUploadForm({ ...uploadForm, documentName: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" placeholder="Optional display name" /></label>
      <label className="text-sm font-semibold">Issue date<input type="date" value={uploadForm.issueDate} onChange={(event) => setUploadForm({ ...uploadForm, issueDate: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label>
      <label className="text-sm font-semibold">Expiry date<input type="date" value={uploadForm.expiryDate} onChange={(event) => setUploadForm({ ...uploadForm, expiryDate: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label>
      {!applicationId && <label className="text-sm font-semibold">Application reference<input value={uploadForm.applicationId} onChange={(event) => setUploadForm({ ...uploadForm, applicationId: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" placeholder="Optional application number" /></label>}
      <label className="text-sm font-semibold md:col-span-2">Description<textarea value={uploadForm.description} onChange={(event) => setUploadForm({ ...uploadForm, description: event.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label>
      <label className="text-sm font-semibold md:col-span-2">File<input required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setUploadForm({ ...uploadForm, file: event.target.files?.[0] || null })} className="mt-1 block w-full rounded-xl border p-2.5" /><span className="mt-1 block text-xs font-normal text-slate-500">PDF, JPG, PNG or WEBP up to {configuration.maxUploadMb} MB.</span></label>
      <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={uploadForm.allowDuplicate} onChange={(event) => setUploadForm({ ...uploadForm, allowDuplicate: event.target.checked })} /> Keep as a separate document if this type already exists</label>
      {busy && <div className="md:col-span-2"><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-700" style={{ width: `${progress}%` }} /></div></div>}
      <div className="flex gap-2 md:col-span-2"><button disabled={busy} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Upload securely</button><button type="button" onClick={() => setShowUpload(false)} className="rounded-xl border px-5 py-2.5 text-sm">Cancel</button></div>
    </form>}
    {!compact && <div className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="relative sm:col-span-2"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input aria-label="Search documents" value={filters.search} onChange={(event) => changeFilter("search", event.target.value)} className="w-full rounded-xl border py-2.5 pl-10 pr-3" placeholder="Name, filename, customer, application" /></label>
      <select aria-label="Document type filter" value={filters.documentType} onChange={(event) => changeFilter("documentType", event.target.value)} className="rounded-xl border px-3"><option value="">All types</option>{configuration?.documentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
      <select aria-label="Verification filter" value={filters.verificationStatus} onChange={(event) => changeFilter("verificationStatus", event.target.value)} className="rounded-xl border px-3"><option value="">All verification</option>{configuration?.verificationStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select>
      <select aria-label="Expiry filter" value={filters.expiryStatus} onChange={(event) => changeFilter("expiryStatus", event.target.value)} className="rounded-xl border px-3"><option value="">All expiry</option>{configuration?.expiryStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select>
      {admin && <><select aria-label="Lock filter" value={filters.locked} onChange={(event) => changeFilter("locked", event.target.value)} className="rounded-xl border px-3"><option value="">Any lock state</option><option value="true">Locked</option><option value="false">Unlocked</option></select><select aria-label="Deleted filter" value={filters.deleted} onChange={(event) => changeFilter("deleted", event.target.value)} className="rounded-xl border px-3"><option value="">Active records</option><option value="true">Deleted records</option><option value="false">Explicitly active</option></select></>}
      {admin && <><input aria-label="Customer user ID filter" value={filters.customerUserId} onChange={(event) => changeFilter("customerUserId", event.target.value)} placeholder="Customer user ID" className="rounded-xl border px-3 py-2.5" /><input aria-label="Application filter" value={filters.applicationId} onChange={(event) => changeFilter("applicationId", event.target.value)} placeholder="Application number" className="rounded-xl border px-3 py-2.5" /><input aria-label="Service ID filter" value={filters.serviceId} onChange={(event) => changeFilter("serviceId", event.target.value)} placeholder="Service ID" className="rounded-xl border px-3 py-2.5" /><input aria-label="Uploaded from date" type="date" value={filters.dateFrom} onChange={(event) => changeFilter("dateFrom", event.target.value)} className="rounded-xl border px-3 py-2.5" /><input aria-label="Uploaded to date" type="date" value={filters.dateTo} onChange={(event) => changeFilter("dateTo", event.target.value)} className="rounded-xl border px-3 py-2.5" /></>}
      <select aria-label="Sort documents" value={`${filters.sortBy}:${filters.sortOrder}`} onChange={(event) => { const [sortBy, sortOrder] = event.target.value.split(":"); setFilters({ ...filters, sortBy, sortOrder, page: 1 }); }} className="rounded-xl border px-3"><option value="createdAt:desc">Newest</option><option value="createdAt:asc">Oldest</option><option value="documentName:asc">Name</option><option value="expiryDate:asc">Expiry date</option><option value="fileSize:desc">File size</option><option value="currentVersion:desc">Version</option></select>
    </div>}
    {loading ? <LoadingSkeleton count={compact ? 2 : 5} /> : !documents.length ? <EmptyState title="No documents found" description={applicationId ? "No reusable customer documents are linked to this application." : "Upload a document or adjust the filters."} /> : <div className="grid gap-4 lg:grid-cols-2">{documents.map((document) => <article key={document._id} className={`rounded-2xl border bg-white p-5 shadow-sm ${document.expiryStatus === "expired" ? "border-rose-200" : ""}`}>
      <div className="flex gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><FileText size={22} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold">{document.documentName}</h3><p className="truncate text-sm text-slate-500">{document.originalFileName}</p></div><div className="flex flex-wrap gap-1"><VerificationBadge status={document.verificationStatus} /><ExpiryBadge status={document.expiryStatus} /></div></div><p className="mt-2 text-xs text-slate-500">{document.documentType.replaceAll("-", " ")} · {formatSize(document.fileSize)} · Version {document.currentVersion} · {formatDate(document.createdAt)}</p>{admin && <p className="mt-1 text-xs text-slate-500">Customer: {document.customerUserId}</p>}</div></div>
      {document.verificationRemarks && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">{document.verificationRemarks}</p>}
      {document.isLocked && <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><Lock size={14} /> Locked{document.lockReason ? `: ${document.lockReason}` : ""}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => openPreview(document)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold text-blue-700"><Eye size={16} /> Preview</button>
        <button type="button" onClick={() => download(document)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold"><Download size={16} /> Download</button>
        <button type="button" onClick={() => openVersions(document)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold"><FileClock size={16} /> Versions</button>
        {document.canReplace && <button type="button" onClick={() => editMetadata(document)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Edit details</button>}
        {document.canReplace && <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-violet-300 px-3 py-2 text-sm font-semibold text-violet-700"><RefreshCw size={16} /> Replace<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(event) => replace(document, event.target.files?.[0])} /></label>}
        {document.canVerify && <button type="button" onClick={() => setReview({ document, status: "under_review", publicRemarks: "", internalRemarks: "" })} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"><ShieldCheck size={16} /> Verify</button>}
        {admin && document.canLock && <button type="button" onClick={() => toggleLock(document)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold">{document.isLocked ? <LockOpen size={16} /> : <Lock size={16} />}{document.isLocked ? "Unlock" : "Lock"}</button>}
        {document.canDelete && <button type="button" onClick={() => setPendingDelete(document)} className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700"><Trash2 size={16} /> Delete</button>}
        {document.canRestore && <button type="button" onClick={() => restore(document)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700"><RefreshCw size={16} /> Restore</button>}
      </div>
    </article>)}</div>}
    {pagination?.pages > 1 && !compact && <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} · {pagination.total} documents</span><div className="flex gap-2"><button disabled={pagination.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button><button disabled={pagination.page >= pagination.pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button></div></div>}
    {review && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-xl rounded-2xl bg-white p-5"><h3 className="text-lg font-bold">Verify {review.document.documentName}</h3><select value={review.status} onChange={(event) => setReview({ ...review, status: event.target.value })} className="mt-4 w-full rounded-xl border p-2.5">{configuration.verificationStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select><textarea value={review.publicRemarks} onChange={(event) => setReview({ ...review, publicRemarks: event.target.value })} className="mt-3 w-full rounded-xl border p-3" placeholder="Customer-visible remarks" /><textarea value={review.internalRemarks} onChange={(event) => setReview({ ...review, internalRemarks: event.target.value })} className="mt-3 w-full rounded-xl border p-3" placeholder="Private internal remarks" /><div className="mt-4 flex gap-2"><button disabled={busy} onClick={submitReview} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Save verification</button><button onClick={() => setReview(null)} className="rounded-xl border px-4 py-2.5 text-sm">Cancel</button></div></div></div>}
      {versions && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5"><div className="flex justify-between"><div><h3 className="text-lg font-bold">Version history</h3><p className="text-sm text-slate-500">{versions.document.documentName}</p></div><button onClick={() => setVersions(null)} aria-label="Close version history">×</button></div><div className="mt-4 divide-y">{versions.versions.map((version) => <article key={version._id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><strong>Version {version.versionNumber}{version.isCurrent ? " · Current" : ""}</strong><span className="text-xs text-slate-500">{formatDate(version.uploadedAt)}</span></div><p className="mt-1 text-sm">{version.originalFileName} · {formatSize(version.fileSize)}</p><p className="mt-1 text-xs text-slate-500">{version.uploadedByRole} · {version.uploadedBy}{version.replacementReason ? ` · ${version.replacementReason}` : ""}</p><div className="mt-2 flex gap-2"><button onClick={() => downloadVersion(version)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-blue-700">Download</button>{version.canRestore && <button onClick={() => restoreVersion(version)} className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700">Restore as new version</button>}</div></article>)}</div>{versions.activity?.length > 0 && <div className="mt-5 border-t pt-4"><h4 className="font-bold">Audit history</h4><div className="mt-2 space-y-2">{versions.activity.map((event) => <p key={event._id} className="rounded-lg bg-slate-50 p-2 text-xs">{event.summary} · {event.actorRole} · {formatDate(event.createdAt)}</p>)}</div></div>}</div></div>}
    <CustomerDocumentPreview preview={preview} onClose={() => setPreview(null)} onDownload={download} />
    <ConfirmDialog open={Boolean(pendingDelete)} title="Delete customer document?" description="The document will be hidden but its versions and audit history will be retained. Locked or active-application documents may be protected." confirmLabel="Delete document" busy={busy} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />
  </section>;
};

export default CustomerDocumentsManager;
