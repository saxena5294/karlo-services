import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { trackApplication } from "../../api/serviceApi";

const statusLabels = { submitted: "Submitted", under_review: "Under review", processing: "Processing", completed: "Completed", rejected: "Rejected" };

const TrackApplication = () => {
  const [searchParams] = useSearchParams();
  const [applicationNumber, setApplicationNumber] = useState(searchParams.get("application") || "");
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setIsLoading(true); setError(""); setApplication(null);
      const data = await trackApplication(applicationNumber.trim());
      setApplication(data.application);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to track this application.");
    } finally { setIsLoading(false); }
  };

  return <>
    <PageHeader eyebrow="Application status" title="Track your application" description="Enter the application number you received after submitting your form." />
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <label htmlFor="applicationNumber" className="font-semibold text-slate-800">Application number</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input id="applicationNumber" value={applicationNumber} onChange={(event) => setApplicationNumber(event.target.value.toUpperCase())} required placeholder="KARLO-2026-XXXXXXXX" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          <button disabled={isLoading} className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white disabled:opacity-60">{isLoading ? "Checking..." : "Track"}</button>
        </div>
      </form>
      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {application && <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-sm text-slate-500">{application.applicationNumber}</p><h2 className="mt-1 text-2xl font-bold">{application.service?.title}</h2></div>
          <span className="w-fit rounded-full bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-700">{statusLabels[application.status] || application.status}</span>
        </div>
        <h3 className="mt-6 font-bold">Status history</h3>
        <ol className="mt-4 space-y-4">{[...application.statusHistory].reverse().map((item, index) => <li key={`${item.changedAt}-${index}`} className="border-l-2 border-blue-200 pl-4"><p className="font-semibold">{statusLabels[item.status] || item.status}</p><p className="mt-1 text-sm text-slate-600">{item.message}</p><time className="mt-1 block text-xs text-slate-400">{new Date(item.changedAt).toLocaleString("en-IN")}</time></li>)}</ol>
      </article>}
    </section>
  </>;
};

export default TrackApplication;
