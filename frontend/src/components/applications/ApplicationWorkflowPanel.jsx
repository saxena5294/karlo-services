import { useCallback, useEffect, useState } from "react";
import { createApplicationComment, getApplicationWorkflow } from "../../api/applicationWorkflowApi";
import EmptyState from "../dashboard/EmptyState";
import LoadingSkeleton from "../dashboard/LoadingSkeleton";
import StatusBadge from "../dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const priorityStyle = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-800",
  urgent: "bg-rose-50 text-rose-700",
};

const ApplicationWorkflowPanel = ({ applicationId, canComment = false, defaultVisibility = "internal" }) => {
  const [workflow, setWorkflow] = useState(null);
  const [form, setForm] = useState({ body: "", visibility: defaultVisibility });
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => getApplicationWorkflow(applicationId)
    .then(({ workflow: value }) => setWorkflow(value))
    .catch((error) => setFeedback(error.response?.data?.message || "Unable to load application workflow.")), [applicationId]);
  useEffect(() => { load(); }, [load]);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await createApplicationComment(applicationId, form);
      setForm({ ...form, body: "" });
      setFeedback("Comment added.");
      await load();
    } catch (error) {
      setFeedback(error.response?.data?.message || "Unable to add comment.");
    } finally { setBusy(false); }
  };
  if (!workflow) return <LoadingSkeleton count={4} />;
  const checklist = workflow.documentChecklist;
  return <div className="space-y-6">
    {feedback && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{feedback}</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Priority</p><span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${priorityStyle[workflow.priority]}`}>{workflow.priority}</span></article>
      <article className={`rounded-2xl border p-4 ${workflow.isOverdue ? "border-rose-200 bg-rose-50" : "bg-white"}`}><p className="text-xs text-slate-500">Expected completion</p><strong className="mt-1 block">{workflow.expectedCompletionAt ? formatDate(workflow.expectedCompletionAt) : "Not scheduled"}</strong>{workflow.isOverdue && <p className="mt-1 text-xs font-semibold text-rose-700">Overdue</p>}</article>
      <article className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Actual completion</p><strong className="mt-1 block">{workflow.actualCompletionAt ? formatDate(workflow.actualCompletionAt) : "In progress"}</strong></article>
      <article className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Document progress</p><strong className="mt-1 block">{checklist.verified} verified · {checklist.pending} pending</strong><p className="text-xs text-slate-500">{checklist.missing.length} required item(s) missing</p></article>
    </section>
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="font-bold">Document checklist</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div><p className="text-xs font-bold uppercase text-slate-500">Required</p>{checklist.required.length ? <ul className="mt-2 space-y-2 text-sm">{checklist.required.map((item) => <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">{item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No required-document snapshot.</p>}</div>
        <div><p className="text-xs font-bold uppercase text-slate-500">Missing</p>{checklist.missing.length ? <ul className="mt-2 space-y-2 text-sm text-rose-700">{checklist.missing.map((item) => <li key={item} className="rounded-lg bg-rose-50 px-3 py-2">{item}</li>)}</ul> : <p className="mt-2 text-sm text-emerald-700">All configured requirements have an uploaded match.</p>}</div>
      </div>
    </section>
    {canComment && <form onSubmit={submit} className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Application comments</h3><div className="mt-3 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]"><select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })} className="rounded-xl border px-3 py-2.5"><option value="internal">Internal only</option><option value="public">Customer visible</option></select><textarea required value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="rounded-xl border p-3" placeholder="Add a workflow comment" /><button disabled={busy} className="self-end rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Add comment</button></div></form>}
    <section className="grid gap-6 xl:grid-cols-2">
      <article className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Comments</h3><div className="mt-4 space-y-3">{workflow.comments.length ? workflow.comments.map((comment) => <div key={comment._id} className="rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap justify-between gap-2"><span className="text-xs font-semibold uppercase text-blue-700">{comment.visibility}</span><time className="text-xs text-slate-400">{formatDate(comment.createdAt)}</time></div><p className="mt-2 text-sm">{comment.body}</p><p className="mt-2 text-xs text-slate-500">{comment.authorRole} · {comment.authorUserId}{comment.editedAt ? " · edited" : ""}</p></div>) : <p className="text-sm text-slate-500">No comments yet.</p>}</div></article>
      <article className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Status history</h3><div className="mt-4 space-y-3">{workflow.statusHistory.length ? workflow.statusHistory.map((event) => <div key={event._id} className="border-l-2 border-blue-200 pl-4"><div className="flex justify-between gap-2"><StatusBadge status={event.status} /><time className="text-xs text-slate-400">{formatDate(event.createdAt)}</time></div><p className="mt-1 text-sm text-slate-600">{event.remarks}</p><p className="mt-1 text-xs text-slate-400">{event.updatedBy}</p></div>) : <EmptyState title="No status history" description="Status changes will appear here." />}</div></article>
    </section>
    <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Complete activity timeline</h3><ol className="mt-5 space-y-0">{workflow.timeline.length ? [...workflow.timeline].reverse().map((event, index) => <li key={event._id || `${event.createdAt}-${index}`} className="relative flex gap-4 pb-6 last:pb-0"><div className="relative flex w-4 justify-center"><span className="mt-1.5 h-3 w-3 rounded-full bg-blue-700 ring-4 ring-blue-100" />{index < workflow.timeline.length - 1 && <span className="absolute bottom-0 top-5 w-px bg-slate-200" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="capitalize">{(event.action || event.eventType || "activity").replaceAll("_", " ")}</strong><time className="text-xs text-slate-400">{formatDate(event.createdAt)}</time></div><p className="mt-1 text-sm text-slate-600">{event.remarks}</p><p className="mt-1 text-xs text-slate-400">{event.actorRole || "system"} · {event.updatedBy}</p></div></li>) : <p className="text-sm text-slate-500">No workflow events.</p>}</ol></section>
  </div>;
};

export default ApplicationWorkflowPanel;
