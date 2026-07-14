import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getServiceBySlug } from "../../api/serviceApi";

const ServiceDetails = () => {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getServiceBySlug(slug)
      .then((data) => setService(data.service))
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load this service."));
  }, [slug]);

  if (error) return <div className="mx-auto max-w-4xl px-4 py-20"><p className="rounded-xl bg-red-50 p-5 text-red-700">{error}</p></div>;
  if (!service) return <p className="mx-auto max-w-4xl px-4 py-20 text-slate-600">Loading service...</p>;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <Link to="/services" className="font-semibold text-blue-700">← All services</Link>
      <div className="mt-6 grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="text-5xl" aria-hidden="true">{service.icon || "📄"}</div>
          <p className="mt-6 font-semibold text-blue-700">{service.category}</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{service.title}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">{service.description}</p>
          <h2 className="mt-8 text-xl font-bold">What happens next?</h2>
          <p className="mt-3 leading-7 text-slate-600">Complete the service-specific form, upload the requested documents, and save the application number returned after submission.</p>
        </div>
        <aside className="h-fit rounded-2xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Service fee</p>
          <p className="mt-1 text-2xl font-bold">₹{Number(service.price).toLocaleString("en-IN")}</p>
          <p className="mt-5 text-sm text-slate-500">Processing time</p>
          <p className="mt-1 font-semibold">{service.processingTime}</p>
          <Link to={`/services/${service.slug}/apply`} className="mt-6 block rounded-xl bg-blue-700 px-5 py-3 text-center font-semibold text-white hover:bg-blue-800">Apply now</Link>
        </aside>
      </div>
    </section>
  );
};

export default ServiceDetails;
