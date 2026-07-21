import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import NotificationBell from "../notifications/NotificationBell";

const getPageTitle = (pathname) => {
  if (/^\/admin\/applications\/[^/]+$/.test(pathname)) return "Application Details";
  if (pathname === "/admin/applications") return "Applications";
  if (pathname === "/admin/customers") return "Customers";
  if (pathname === "/admin/experts") return "Experts";
  if (/^\/admin\/services\/[^/]+\/edit$/.test(pathname)) return "Edit Service";
  if (pathname === "/admin/services/new") return "Create Service";
  if (pathname === "/admin/services") return "Services";
  if (pathname === "/admin/reports") return "Reports";
  if (pathname === "/admin/notifications") return "Notifications";
  if (pathname === "/admin/settings") return "Settings";
  if (pathname === "/admin/dashboard") return "Admin Dashboard";
  if (/^\/expert\/applications\/[^/]+$/.test(pathname)) return "Application Details";
  if (pathname === "/expert/applications") return "Assigned Applications";
  if (pathname === "/expert/profile") return "Profile";
  if (pathname === "/expert/notifications") return "Notifications";
  if (pathname === "/expert/dashboard") return "Expert Dashboard";
  if (pathname === "/partner/dashboard") return "Partner Dashboard";
  if (pathname === "/partner/leads") return "Available Leads";
  if (/^\/partner\/leads\/[^/]+$/.test(pathname)) return "Lead Details";
  if (pathname === "/partner/accepted-leads") return "Accepted Leads";
  if (pathname === "/partner/completed-leads") return "Completed Leads";
  if (/^\/partner\/applications\/[^/]+$/.test(pathname)) return "Accepted Work";
  if (pathname === "/partner/wallet") return "Wallet";
  if (pathname === "/partner/notifications") return "Notifications";
  if (pathname === "/partner/profile") return "Profile";
  if (/^\/customer\/applications\/[^/]+$/.test(pathname)) return "Application Details";
  if (pathname === "/customer/applications") return "My Applications";
  if (pathname === "/customer/profile") return "Profile";
  if (pathname === "/customer/notifications") return "Notifications";
  return "Customer Dashboard";
};

const DashboardHeader = ({ onMenuClick, portal = "customer" }) => {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="mr-3 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open dashboard navigation"
      >
        <Menu size={24} />
      </button>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{portal} portal</p>
        <h1 className="truncate text-xl font-bold sm:text-2xl">{getPageTitle(pathname)}</h1>
      </div>
      <div className="ml-auto hidden rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 sm:block">
        Development {portal[0].toUpperCase()}{portal.slice(1)}
      </div>
      <div className="ml-3"><NotificationBell portal={portal} /></div>
    </header>
  );
};

export default DashboardHeader;
