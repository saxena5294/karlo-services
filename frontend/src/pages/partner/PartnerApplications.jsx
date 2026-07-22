import { useEffect, useState } from "react";
import { getPartnerApplications } from "../../api/partnerApi";
import ApplicationTable from "../../components/dashboard/ApplicationTable";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { formatDate } from "../../utils/dashboardFormatters";

const PartnerApplications = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    getPartnerApplications({ limit: 100 }).then((value) => current && setData(value)).catch((requestError) => current && setError(requestError.response?.data?.message || "Unable to load assignments."));
    return () => { current = false; };
  }, []);
  if (error) return <EmptyState title="Assignments unavailable" description={error} />;
  if (!data) return <LoadingSkeleton count={5} />;
  const columns = [
    { label: "Application", render: (item) => item.applicationNumber, cellClassName: "font-semibold" },
    { label: "Customer", render: (item) => item.customerName },
    { label: "Service", render: (item) => item.service?.title },
    { label: "Status", render: (item) => <StatusBadge status={item.status} /> },
    { label: "Assigned", render: (item) => formatDate(item.assignedAt) },
  ];
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Assigned applications</h1><p className="mt-1 text-slate-500">Only applications currently assigned to your approved partner profile are shown.</p></div>{data.applications.length ? <ApplicationTable applications={data.applications} columns={columns} getRowLink={(item) => `/partner/applications/${item._id}`} /> : <EmptyState title="No assignments" description="Admin-assigned work will appear here." />}</div>;
};

export default PartnerApplications;
