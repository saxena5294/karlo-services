import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addApplicationRemark, assignApplication, getAdminApplicationById, getAdminExperts, publishApplicationLead, requestApplicationDocuments, updateApplicationStatus } from "../../api/adminApi";
import ConfirmDialog from "../../components/dashboard/ConfirmDialog";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import DocumentViewer from "../../components/documents/DocumentViewer";
import { formatDate, formatFieldName, formatFieldValue } from "../../utils/dashboardFormatters";

const statuses = ["Documents Required", "Processing", "Approved", "Completed", "Rejected", "Cancelled"];
const defaultLeadExpiry = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);

const AdminApplicationDetails = () => {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [experts, setExperts] = useState([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [assignment, setAssignment] = useState({ assignmentType: "expert", assignedExpertId: "", assignedPartnerId: "", remarks: "" });
  const [statusData, setStatusData] = useState({ status: "Processing", remarks: "" });
  const [remarkData, setRemarkData] = useState({ visibility: "internal", remarks: "" });
  const [documents, setDocuments] = useState("");
  const [leadData, setLeadData] = useState({ city: "", pincode: "", safeRequirementSummary: "", leadPrice: 0, status: "open", expiresAt: defaultLeadExpiry });

  useEffect(() => {
    let active = true;
    Promise.all([getAdminApplicationById(id), getAdminExperts({ status: "active", limit: 100 })])
      .then(([app, people]) => {
        if (!active) return;
        setApplication(app.application);
        setExperts(people.experts);
        setAssignment((current) => ({ ...current, assignmentType: app.application.assignmentType || "none", assignedExpertId: app.application.assignedExpertId || "", assignedPartnerId: app.application.assignedPartnerId || "" }));
      })
      .catch((requestError) => active && setError(requestError.response?.data?.message || "Unable to load application."));
    return () => { active = false; };
  }, [id, refresh]);

  const run = async (action, success) => {
    setBusy(true); setFeedback({ type: "", message: "" });
    try { await action(); setFeedback({ type: "success", message: success }); setPending(null); setRefresh((value) => value + 1); }
    catch (requestError) { setPending(null); setFeedback({ type: "error", message: requestError.response?.data?.message || "Action failed." }); }
    finally { setBusy(false); }
  };
  const assignmentPayload = () => ({
    assignmentType: assignment.assignmentType,
    assignedExpertId: assignment.assignmentType === "expert" ? assignment.assignedExpertId : undefined,
    assignedPartnerId: assignment.assignmentType === "partner" ? assignment.assignedPartnerId : undefined,
    remarks: assignment.remarks,
  });
  const confirm = () => pending === "assign"
    ? run(() => assignApplication(id, assignmentPayload()), "Assignment updated.")
    : pending === "status"
      ? run(() => updateApplicationStatus(id, statusData), "Status updated.")
      : run(() => requestApplicationDocuments(id, { remarks: documents }), "Document request created.");
  const submitRemark = (event) => { event.preventDefault(); run(() => addApplicationRemark(id, remarkData), `${remarkData.visibility === "internal" ? "Internal" : "Customer-visible"} remark added.`).then(() => setRemarkData({ ...remarkData, remarks: "" })); };

  if (error) return <EmptyState title="Application unavailable" description={error} />;
  if (!application) return <LoadingSkeleton count={7} />;
  const labels = Object.fromEntries((application.serviceForm?.fields || []).map((field) => [field.name, field.label]));
  const assignmentReady = assignment.assignmentType === "none" || (assignment.assignmentType === "expert" ? assignment.assignedExpertId : assignment.assignedPartnerId.trim());

  return <div className="space-y-6"><Link to="/admin/applications" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft size={17} /> Back to applications</Link>{feedback.message && <p className={`rounded-xl px-4 py-3 text-sm ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{feedback.message}</p>}
    <section className="rounded-2xl border bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><p className="font-semibold text-blue-700">{application.applicationNumber}</p><h2 className="mt-2 text-2xl font-bold">{application.service?.title}</h2><p className="mt-2 text-sm text-slate-500">{application.customerName} · {application.fulfillmentType || "internal"} fulfillment · Submitted {formatDate(application.createdAt)}</p></div><StatusBadge status={application.status} /></div></section>
    <section className="grid gap-5 xl:grid-cols-3"><div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Assign work</h3><select value={assignment.assignmentType} onChange={(event) => setAssignment({ ...assignment, assignmentType: event.target.value })} className="mt-4 w-full rounded-xl border px-3 py-2.5"><option value="none">Nobody</option><option value="expert">Expert</option><option value="partner">Partner</option></select>{assignment.assignmentType === "expert" && <select value={assignment.assignedExpertId} onChange={(event) => setAssignment({ ...assignment, assignedExpertId: event.target.value })} className="mt-3 w-full rounded-xl border px-3 py-2.5"><option value="">Select active expert</option>{experts.map((item) => <option key={item._id} value={item.userId}>{item.displayName}</option>)}</select>}{assignment.assignmentType === "partner" && <input value={assignment.assignedPartnerId} onChange={(event) => setAssignment({ ...assignment, assignedPartnerId: event.target.value })} placeholder="Partner user ID" className="mt-3 w-full rounded-xl border px-3 py-2.5" />}<textarea value={assignment.remarks} onChange={(event) => setAssignment({ ...assignment, remarks: event.target.value })} placeholder="Assignment remarks" className="mt-3 w-full rounded-xl border px-3 py-2" /><button disabled={!assignmentReady} onClick={() => setPending("assign")} className="mt-3 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Update assignment</button></div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Update status</h3><select value={statusData.status} onChange={(event) => setStatusData({ ...statusData, status: event.target.value })} className="mt-4 w-full rounded-xl border px-3 py-2.5">{statuses.map((item) => <option key={item}>{item}</option>)}</select><textarea value={statusData.remarks} onChange={(event) => setStatusData({ ...statusData, remarks: event.target.value })} placeholder="Customer-facing status remarks" className="mt-3 w-full rounded-xl border px-3 py-2" /><button disabled={statusData.status === application.status} onClick={() => setPending("status")} className="mt-3 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Update status</button></div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Request documents</h3><textarea rows="5" value={documents} onChange={(event) => setDocuments(event.target.value)} placeholder="Describe required documents" className="mt-4 w-full rounded-xl border px-3 py-2" /><button disabled={!documents.trim()} onClick={() => setPending("documents")} className="mt-3 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Request documents</button></div></section>
    <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Add remark</h3><form onSubmit={submitRemark} className="mt-4 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]"><select value={remarkData.visibility} onChange={(event) => setRemarkData({ ...remarkData, visibility: event.target.value })} className="rounded-xl border px-3"><option value="internal">Internal only</option><option value="customer">Customer visible</option></select><textarea required value={remarkData.remarks} onChange={(event) => setRemarkData({ ...remarkData, remarks: event.target.value })} placeholder="Write a remark" className="rounded-xl border px-3 py-2" /><button disabled={busy} className="self-end rounded-xl border border-blue-700 px-4 py-2.5 text-sm font-semibold text-blue-700">Add remark</button></form></section>
    {["partner", "hybrid"].includes(application.fulfillmentType) && !application.assignedExpertId && !application.assignedPartnerId && <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Publish to Partner Marketplace</h3><p className="mt-1 text-sm text-slate-500">Use only a privacy-safe summary. Never copy customer names, contact details, IDs or document data here.</p><div className="mt-4 grid gap-3 md:grid-cols-3"><input required value={leadData.city} onChange={(event) => setLeadData({ ...leadData, city: event.target.value })} placeholder="Service city" className="rounded-xl border px-3 py-2.5" /><input required value={leadData.pincode} onChange={(event) => setLeadData({ ...leadData, pincode: event.target.value })} placeholder="Pincode" className="rounded-xl border px-3 py-2.5" /><input required min="0" type="number" value={leadData.leadPrice} onChange={(event) => setLeadData({ ...leadData, leadPrice: Number(event.target.value) })} placeholder="Lead price" className="rounded-xl border px-3 py-2.5" /><textarea required value={leadData.safeRequirementSummary} onChange={(event) => setLeadData({ ...leadData, safeRequirementSummary: event.target.value })} placeholder="Privacy-safe requirement summary" className="rounded-xl border p-3 md:col-span-2" /><input required type="datetime-local" value={leadData.expiresAt} onChange={(event) => setLeadData({ ...leadData, expiresAt: event.target.value })} className="rounded-xl border px-3 py-2.5" /></div><button disabled={busy || !leadData.city || !leadData.pincode || !leadData.safeRequirementSummary.trim()} onClick={() => run(() => publishApplicationLead(id, leadData), "Lead published to the Partner Marketplace.")} className="mt-4 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Publish lead</button></section>}
    <section className="rounded-2xl border bg-white p-6 shadow-sm"><h3 className="font-bold">Applicant data</h3><dl className="mt-5 grid gap-4 sm:grid-cols-2">{Object.entries(application.formData || {}).map(([key, value]) => <div key={key} className="border-b pb-3"><dt className="text-sm text-slate-500">{labels[key] || formatFieldName(key)}</dt><dd className="mt-1 break-words font-semibold">{formatFieldValue(value)}</dd></div>)}</dl></section>
    <DocumentViewer applicationId={id} title="Application document review" />
    <section className="grid gap-6 xl:grid-cols-2"><div className="rounded-2xl border bg-white p-6 shadow-sm"><h3 className="font-bold">Customer-visible timeline</h3><div className="mt-4 divide-y">{[...application.timeline].reverse().map((item) => <div key={item._id} className="py-3"><div className="flex justify-between"><StatusBadge status={item.status} /><span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span></div><p className="mt-2 text-sm text-slate-600">{item.remarks}</p></div>)}</div></div><div className="space-y-6"><div className="rounded-2xl border bg-white p-6 shadow-sm"><h3 className="font-bold">Internal remarks</h3><div className="mt-3 divide-y">{application.internalRemarks.length ? application.internalRemarks.map((item) => <div key={item._id} className="py-3 text-sm"><p>{item.remarks}</p><p className="mt-1 text-xs text-slate-400">{item.createdBy} · {formatDate(item.createdAt)}</p></div>) : <p className="text-sm text-slate-500">No internal remarks.</p>}</div></div><div className="rounded-2xl border bg-white p-6 shadow-sm"><h3 className="font-bold">Assignment history</h3><div className="mt-3 divide-y">{application.assignmentHistory.length ? application.assignmentHistory.map((item) => <div key={item._id} className="py-3 text-sm"><p className="font-semibold">{item.assignmentType || "expert"}: {item.expertUserId || item.partnerUserId}</p><p className="text-slate-500">{item.remarks || "Assigned"}</p><p className="mt-1 text-xs text-slate-400">By {item.assignedBy} · {formatDate(item.createdAt)}{item.isActive ? " · Active" : ""}</p></div>) : <p className="text-sm text-slate-500">No assignment history.</p>}</div></div></div></section>
    <ConfirmDialog open={Boolean(pending)} title={pending === "assign" ? "Confirm assignment" : pending === "status" ? "Confirm status update" : "Confirm document request"} description="This action updates application history and may notify the customer or assignee." confirmLabel="Confirm action" busy={busy} onCancel={() => setPending(null)} onConfirm={confirm} />
  </div>;
};

export default AdminApplicationDetails;
