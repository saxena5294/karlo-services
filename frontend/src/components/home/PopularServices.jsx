import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPopularServices } from "../../api/serviceApi";
import ServiceCard from "./ServiceCard";

const PopularServices = () => {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPopularServices = async () => {
      try {
        setIsLoading(true);
        setError("");

        const data = await getPopularServices();

        setServices(data.services || []);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Unable to load services. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularServices();
  }, []);

  return (
    <section className="py-14 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 sm:text-base">
              Popular services
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">
              Services you can apply for
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Choose from our most requested government and documentation
              services.
            </p>
          </div>

          <Link
            to="/services"
            className="w-fit font-semibold text-blue-700 transition hover:text-blue-800"
          >
            View all services →
          </Link>
        </div>

        {isLoading && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <div className="h-14 w-14 rounded-2xl bg-slate-200" />
                <div className="mt-5 h-6 w-2/3 rounded bg-slate-200" />
                <div className="mt-4 h-4 w-full rounded bg-slate-200" />
                <div className="mt-2 h-4 w-4/5 rounded bg-slate-200" />
                <div className="mt-6 h-11 rounded-xl bg-slate-200" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-700">{error}</p>
          </div>
        )}

        {!isLoading && !error && services.length === 0 && (
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-semibold text-slate-800">
              No services are available right now.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              New services will appear here automatically.
            </p>
          </div>
        )}

        {!isLoading && !error && services.length > 0 && (
          <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PopularServices;