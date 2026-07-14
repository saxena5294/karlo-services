import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import ServiceCard from "../../components/home/ServiceCard";
import { getAllServices } from "../../api/serviceApi";

const Services = () => {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAllServices()
      .then((data) => setServices(data.services || []))
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load services."))
      .finally(() => setIsLoading(false));
  }, []);

  const visibleServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return services;
    return services.filter(({ title, description, category }) =>
      [title, description, category].some((value) => value?.toLowerCase().includes(query))
    );
  }, [search, services]);

  return (
    <>
      <PageHeader eyebrow="Explore" title="All services" description="Choose a service, review its details, and submit one secure online application." />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <label className="block max-w-xl">
          <span className="text-sm font-semibold text-slate-700">Search services</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or category" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>
        {isLoading && <p className="mt-10 text-slate-600">Loading services...</p>}
        {error && <p className="mt-10 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {!isLoading && !error && (
          visibleServices.length ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibleServices.map((service) => <ServiceCard key={service._id} service={service} />)}</div>
          ) : <p className="mt-10 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">No matching services found.</p>
        )}
      </section>
    </>
  );
};

export default Services;
