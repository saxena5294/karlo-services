import {
  FileText,
  FileWarning,
  ListChecks,
  LayoutDashboard,
  Search,
  UserRound,
  X,
  Wrench,
  Users,
  Store,
  BarChart3,
  Bell,
  Settings,
  ClipboardList,
  ScrollText,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { dashboardFeatures } from "../../config/dashboardFeatures";

const customerNavigation = [
  { name: "Dashboard", path: "/customer/dashboard", icon: LayoutDashboard },
  { name: "Services", path: "/customer/services", icon: Wrench },
  { name: "My Applications", path: "/customer/applications", icon: FileText },
  { name: "Form History", path: "/customer/form-history", icon: ClipboardList },
  { name: "Software", path: "/customer/software", icon: Wrench, disabled: !dashboardFeatures.softwareDownloads },
  { name: "Declaration Forms", path: "/customer/declaration-forms", icon: FileText, disabled: !dashboardFeatures.declarationForms },
  { name: "Payment History", path: "/customer/payment-history", icon: BarChart3, disabled: !dashboardFeatures.paymentHistory },
  { name: "Refer & Earn", path: "/customer/refer-and-earn", icon: Users, disabled: !dashboardFeatures.referAndEarn },
  { name: "Rewards", path: "/customer/rewards", icon: Store, disabled: !dashboardFeatures.rewards },
  { name: "Notifications", path: "/customer/notifications", icon: Bell },
  { name: "Help / Support", path: "/customer/help", icon: Search, disabled: !dashboardFeatures.customerSupport },
  { name: "Profile", path: "/customer/profile", icon: UserRound },
];

const expertNavigation = [
  { name: "Dashboard", path: "/expert/dashboard", icon: LayoutDashboard },
  { name: "Assigned Applications", path: "/expert/applications", icon: FileText, unfiltered: true },
  { name: "Completed", path: "/expert/applications?status=Completed", icon: ListChecks, status: "Completed" },
  { name: "Pending Documents", path: "/expert/applications?status=Documents%20Required", icon: FileWarning, status: "Documents Required" },
  { name: "Profile", path: "/expert/profile", icon: UserRound },
];

const partnerNavigation = [
  { name: "Dashboard", path: "/partner/dashboard", icon: LayoutDashboard },
  { name: "Assigned Applications", path: "/partner/applications", icon: FileText },
  { name: "Services", path: "/partner/services", icon: Wrench },
  { name: "Form History", path: "/partner/form-history", icon: ClipboardList },
  { name: "Software", path: "/partner/software", icon: Wrench, disabled: !dashboardFeatures.softwareDownloads },
  { name: "Declaration Forms", path: "/partner/declaration-forms", icon: FileText, disabled: !dashboardFeatures.declarationForms },
  { name: "Payment History", path: "/partner/payment-history", icon: BarChart3, disabled: !dashboardFeatures.paymentHistory },
  { name: "Renewal", path: "/partner/renewal", icon: ScrollText, disabled: !dashboardFeatures.renewal },
  { name: "Refer & Earn", path: "/partner/refer-and-earn", icon: Users, disabled: !dashboardFeatures.referAndEarn },
  { name: "Rewards", path: "/partner/rewards", icon: Store, disabled: !dashboardFeatures.rewards },
  { name: "Help & Tickets", path: "/partner/help", icon: Search },
  { name: "Notifications", path: "/partner/notifications", icon: Bell },
  { name: "Profile", path: "/partner/profile", icon: UserRound },
  ...(dashboardFeatures.leadMarketplace ? [
    { name: "Available Leads", path: "/partner/leads", icon: Store },
    { name: "Accepted Leads", path: "/partner/accepted-leads", icon: FileText },
    { name: "Accepted Work", path: "/partner/completed-leads", icon: ListChecks },
  ] : []),
];

const adminNavigation = [
  { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Applications", path: "/admin/applications", icon: FileText },
  { name: "Assignments", path: "/admin/assignments", icon: ClipboardList },
  { name: "Customers", path: "/admin/customers", icon: Users },
  { name: "Experts", path: "/admin/experts", icon: Store },
  { name: "Partners", path: "/admin/partners", icon: Users },
  ...(dashboardFeatures.leadMarketplace ? [{ name: "Leads", path: "/admin/leads", icon: ListChecks }] : []),
  { name: "Services", path: "/admin/services", icon: Wrench },
  { name: "Reports", path: "/admin/reports", icon: BarChart3 },
  { name: "Notifications", path: "/admin/notifications", icon: Bell },
  { name: "Content", path: "/admin/content", icon: FileText },
  { name: "Audit Logs", path: "/admin/audit-logs", icon: ScrollText },
  { name: "Settings", path: "/admin/settings", icon: Settings },
];

const DashboardSidebar = ({ isOpen, onClose, portal = "customer" }) => {
  const { pathname, search } = useLocation();
  const navigation = portal === "admin"
    ? adminNavigation
    : portal === "partner"
      ? partnerNavigation
    : portal === "expert"
      ? expertNavigation
      : customerNavigation;
  const portalLabel = `${portal[0].toUpperCase()}${portal.slice(1)} Portal`;
  const currentStatus = new URLSearchParams(search).get("status");

  return <>
    {isOpen && (
      <button
        type="button"
        aria-label="Close dashboard navigation"
        className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        onClick={onClose}
      />
    )}

    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-20 items-center justify-between border-b border-slate-200 px-6">
        <Link to="/" className="flex items-center gap-3" onClick={onClose}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white">
            K
          </span>
          <span>
            <span className="block text-xl font-bold text-blue-700">Karlo</span>
            <span className="block text-xs text-slate-500">{portalLabel}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Close menu"
        >
          <X size={22} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label={`${portalLabel} navigation`}>
        {navigation.map(({ name, path, icon: Icon, disabled }) => disabled ? (
          <div key={path} aria-disabled="true" title="This service will be available soon." className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400 opacity-60">
            <Icon size={20} /><span className="min-w-0 flex-1">{name}</span><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">Coming Soon</span>
          </div>
        ) : (
          <Link
            key={path}
            to={path}
            onClick={onClose}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                pathname === path.split("?")[0] &&
                (path.includes("status=")
                  ? currentStatus === decodeURIComponent(path.split("status=")[1])
                  : !path.includes("/expert/applications") || !currentStatus)
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
          >
            <Icon size={20} />
            {name}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          Development access is active. Clerk authentication will replace it later.
        </p>
      </div>
    </aside>
  </>;
};

export default DashboardSidebar;
