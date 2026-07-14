import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DynamicForm from "../../components/forms/DynamicForm";
import { getServiceForm, submitServiceApplication } from "../../api/serviceApi";

const ApplyService = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    getServiceForm(slug)
      .then(setData)
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load the application form."));
  }, [slug]);

  const submit = async (formData) => {
    try {
      setIsSubmitting(true);
      setError("");
      setResult(await submitServiceApplication(slug, formData));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      const response = requestError.response?.data;
      setError(response?.errors?.join(" ") || response?.message || "Unable to submit your application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error && !data) return <div className="mx-auto max-w-3xl px-4 py-16"><p className="rounded-xl bg-red-50 p-5 text-red-700">{error}</p></div>;
  if (!data) return <p className="mx-auto max-w-3xl px-4 py-16 text-slate-600">Loading application form...</p>;

  if (result) return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
        <h1 className="mt-6 text-3xl font-bold">Application submitted</h1>
        <p className="mt-3 text-slate-600">Save this application number to track your progress.</p>
        <p className="mt-6 break-all rounded-xl bg-slate-100 px-4 py-4 text-xl font-bold text-blue-700">{result.applicationNumber}</p>
        <Link to={`/track?application=${encodeURIComponent(result.applicationNumber)}`} className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white">Track application</Link>
      </div>
    </section>
  );

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link to={`/services/${slug}`} className="font-semibold text-blue-700">← Service details</Link>
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        <p className="font-semibold text-blue-700">{data.service.title}</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{data.form.title}</h1>
        {data.form.description && <p className="mt-3 text-slate-600">{data.form.description}</p>}
        <div className="my-7 border-t border-slate-200" />
        {error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        <DynamicForm fields={data.form.fields} isSubmitting={isSubmitting} onSubmit={submit} />
      </div>
    </section>
  );
};

export default ApplyService;
