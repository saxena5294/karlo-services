import { ArrowLeft, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCustomerApplicationById } from "../../api/customerApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import {
  formatDate,
  formatFieldName,
  formatFieldValue,
  formatFileSize,
} from "../../utils/dashboardFormatters";

const CustomerApplicationDetails = () => {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    getCustomerApplicationById(id)
      .then((response) => isCurrent && setApplication(response.application))
      .catch((requestError) => {
        if (isCurrent) setError(requestError.response?.data?.message || "Unable to load this application.");
      });
    return () => {
      isCurrent = false;
    };
  }, [id]);

  if (error) {
    return <EmptyState title="Application not available" description={error} action={<Link to="/customer/applications" className="font-semibold text-blue-700 hover:underline">Back to my applications</Link>} />;
  }
  if (!application) return <LoadingSkeleton count={5} />;

  const labels = Object.fromEntries(
    (application.serviceForm?.fields || []).map(({ name, label }) => [name, label])
  );

  return (
    <div className="space-y-6">
      <Link to="/customer/applications" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"><ArrowLeft size={17} /> Back to applications</Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0"><p className="break-all text-sm font-semibold text-blue-700">{application.applicationNumber}</p><h2 className="mt-2 text-2xl font-bold">{application.service?.title}</h2><p className="mt-2 text-sm text-slate-500">Submitted {formatDate(application.createdAt)} · Updated {formatDate(application.updatedAt)}</p></div>
          <StatusBadge status={application.status} />
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold">Completed documents</h2>
        {!application.completionDocuments?.length ? <p className="mt-4 text-sm text-slate-500">Completed documents will appear here when your assigned team member uploads them.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{application.completionDocuments.map((file, index) => <a key={`${file.originalName}-${index}`} href={file.secureUrl} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-3 rounded-xl border border-emerald-200 p-4 text-emerald-800"><FileText size={20} className="shrink-0" /><span className="min-w-0"><strong className="block truncate">{file.originalName}</strong><span className="text-xs">{file.format?.toUpperCase() || "File"} · {formatFileSize(file.size)}</span></span></a>)}</div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold">Applicant data</h2>
        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {Object.entries(application.formData || {}).map(([key, value]) => (
            <div key={key} className="min-w-0 border-b border-slate-100 pb-4"><dt className="text-sm font-medium text-slate-500">{labels[key] || formatFieldName(key)}</dt><dd className="mt-1 break-words font-semibold text-slate-800">{formatFieldValue(value)}</dd></div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold">Uploaded documents</h2>
        {!application.files.length ? <p className="mt-4 text-sm text-slate-500">No documents were uploaded with this application.</p> : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {application.files.map((file, index) => (
              <div key={`${file.fieldName}-${index}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><FileText size={20} /></span><div className="min-w-0"><p className="truncate font-semibold">{file.originalName}</p><p className="mt-1 text-xs text-slate-500">{labels[file.fieldName] || formatFieldName(file.fieldName)} · {file.format?.toUpperCase() || "File"} · {formatFileSize(file.size)}</p></div></div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold">Application timeline</h2>
        <ol className="mt-6 space-y-0">
          {[...application.timeline].reverse().map((entry, index) => (
            <li key={`${entry.createdAt}-${index}`} className="relative flex gap-4 pb-7 last:pb-0"><div className="relative flex w-4 shrink-0 justify-center"><span className="mt-1.5 h-3 w-3 rounded-full bg-blue-700 ring-4 ring-blue-100" />{index < application.timeline.length - 1 && <span className="absolute bottom-0 top-5 w-px bg-slate-200" />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{entry.status}</p><time className="text-xs text-slate-400">{formatDate(entry.createdAt)}</time></div>{entry.remarks && <p className="mt-1 break-words text-sm leading-6 text-slate-600">{entry.remarks}</p>}</div></li>
          ))}
        </ol>
      </section>
    </div>
  );
};

export default CustomerApplicationDetails;
