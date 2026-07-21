import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addExpertRemark,
  getExpertApplicationById,
  requestApplicationDocuments,
  updateExpertApplicationStatus,
} from "../../api/expertApi";
import ConfirmDialog from "../../components/dashboard/ConfirmDialog";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import DocumentViewer from "../../components/documents/DocumentViewer";
import {
  formatDate,
  formatFieldName,
  formatFieldValue,
} from "../../utils/dashboardFormatters";

const expertStatuses = [
  "Documents Required",
  "Processing",
  "Approved",
  "Completed",
  "Rejected",
];

const ExpertApplicationDetails = () => {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("Processing");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [remark, setRemark] = useState("");
  const [documentRequest, setDocumentRequest] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    getExpertApplicationById(id)
      .then((response) => isCurrent && setApplication(response.application))
      .catch((error) => {
        if (isCurrent)
          setLoadError(
            error.response?.data?.message || "Unable to load this application.",
          );
      });
    return () => {
      isCurrent = false;
    };
  }, [id, refreshKey]);

  const runConfirmedAction = async () => {
    setBusy(true);
    setFeedback({ type: "", message: "" });
    try {
      if (pendingAction === "status") {
        await updateExpertApplicationStatus(id, {
          status,
          remarks: statusRemarks.trim(),
        });
        setStatusRemarks("");
        setFeedback({
          type: "success",
          message: `Status changed to ${status}.`,
        });
      } else {
        await requestApplicationDocuments(id, documentRequest.trim());
        setDocumentRequest("");
        setFeedback({
          type: "success",
          message: "Document request added to the timeline.",
        });
      }
      setPendingAction(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setPendingAction(null);
      setFeedback({
        type: "error",
        message:
          error.response?.data?.message || "Unable to update the application.",
      });
    } finally {
      setBusy(false);
    }
  };

  const submitRemark = async (event) => {
    event.preventDefault();
    if (!remark.trim()) return;
    setBusy(true);
    setFeedback({ type: "", message: "" });
    try {
      await addExpertRemark(id, remark.trim());
      setRemark("");
      setFeedback({
        type: "success",
        message: "Remark added to the timeline.",
      });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "Unable to add the remark.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (loadError)
    return (
      <EmptyState
        title="Application not available"
        description={loadError}
        action={
          <Link
            to="/expert/applications"
            className="font-semibold text-blue-700 hover:underline"
          >
            Back to assignments
          </Link>
        }
      />
    );
  if (!application) return <LoadingSkeleton count={6} />;

  const labels = Object.fromEntries(
    (application.serviceForm?.fields || []).map(({ name, label }) => [
      name,
      label,
    ]),
  );

  return (
    <div className="space-y-6">
      <Link
        to="/expert/applications"
        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
      >
        <ArrowLeft size={17} /> Back to assignments
      </Link>

      {feedback.message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
        >
          {feedback.message}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="break-all text-sm font-semibold text-blue-700">
              {application.applicationNumber}
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              {application.service?.title}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Customer: {application.customerName} · Assigned{" "}
              {formatDate(application.assignedAt)}
            </p>
          </div>
          <StatusBadge status={application.status} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-bold">Update status</h2>
          <p className="mt-1 text-sm text-slate-500">
            Lifecycle transition rules still apply.
          </p>
          <label
            htmlFor="expert-status"
            className="mt-5 block text-sm font-semibold"
          >
            New status
          </label>
          <select
            id="expert-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            {expertStatuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <label
            htmlFor="status-remarks"
            className="mt-4 block text-sm font-semibold"
          >
            Remarks
          </label>
          <textarea
            id="status-remarks"
            value={statusRemarks}
            onChange={(event) => setStatusRemarks(event.target.value)}
            rows="3"
            maxLength="1000"
            placeholder="Add a customer-facing status note"
            className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            disabled={busy || status === application.status}
            onClick={() => setPendingAction("status")}
            className="mt-4 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Update status
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-bold">Request documents</h2>
          <p className="mt-1 text-sm text-slate-500">
            This changes the status to Documents Required and notifies the
            customer timeline.
          </p>
          <label
            htmlFor="document-request"
            className="mt-5 block text-sm font-semibold"
          >
            Missing documents
          </label>
          <textarea
            id="document-request"
            value={documentRequest}
            onChange={(event) => setDocumentRequest(event.target.value)}
            rows="5"
            maxLength="1000"
            placeholder="Describe each required document clearly"
            className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            disabled={busy || !documentRequest.trim()}
            onClick={() => setPendingAction("documents")}
            className="mt-4 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Request documents
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold">Add expert remark</h2>
        <p className="mt-1 text-sm text-slate-500">
          Remarks are customer-facing timeline entries and do not change the
          current status.
        </p>
        <form
          onSubmit={submitRemark}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="expert-remark" className="sr-only">
            Expert remark
          </label>
          <textarea
            id="expert-remark"
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            rows="2"
            maxLength="1000"
            placeholder="Write a progress update"
            className="min-w-0 flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={busy || !remark.trim()}
            className="self-end rounded-xl border border-blue-700 px-5 py-2.5 text-sm font-semibold text-blue-700 disabled:opacity-50"
          >
            Add remark
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold">Applicant information</h2>
        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {Object.entries(application.formData || {}).map(([key, value]) => (
            <div key={key} className="min-w-0 border-b border-slate-100 pb-4">
              <dt className="text-sm font-medium text-slate-500">
                {labels[key] || formatFieldName(key)}
              </dt>
              <dd className="mt-1 break-words font-semibold text-slate-800">
                {formatFieldValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <DocumentViewer applicationId={id} title="Assigned application documents" />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold">Application timeline</h2>
        <ol className="mt-6 space-y-0">
          {[...application.timeline].reverse().map((entry, index) => (
            <li
              key={`${entry.createdAt}-${index}`}
              className="relative flex gap-4 pb-7 last:pb-0"
            >
              <div className="relative flex w-4 shrink-0 justify-center">
                <span className="mt-1.5 h-3 w-3 rounded-full bg-blue-700 ring-4 ring-blue-100" />
                {index < application.timeline.length - 1 && (
                  <span className="absolute bottom-0 top-5 w-px bg-slate-200" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{entry.status}</p>
                  <time className="text-xs text-slate-400">
                    {formatDate(entry.createdAt)}
                  </time>
                </div>
                {entry.remarks && (
                  <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                    {entry.remarks}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction === "status"
            ? "Confirm status update"
            : "Confirm document request"
        }
        description={
          pendingAction === "status"
            ? `Change this application from ${application.status} to ${status}? A timeline entry will be created.`
            : "Change this application to Documents Required and add the request to the customer timeline?"
        }
        confirmLabel={
          pendingAction === "status" ? "Update status" : "Request documents"
        }
        busy={busy}
        onCancel={() => setPendingAction(null)}
        onConfirm={runConfirmedAction}
      />
    </div>
  );
};

export default ExpertApplicationDetails;
