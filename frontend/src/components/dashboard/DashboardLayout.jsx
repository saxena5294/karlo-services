import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";

const DashboardLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const portal = pathname.startsWith("/admin")
    ? "admin"
    : pathname.startsWith("/partner")
      ? "partner"
    : pathname.startsWith("/expert")
      ? "expert"
      : "customer";

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <DashboardSidebar
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        portal={portal}
      />
      <div className="min-w-0 lg:pl-72">
        <DashboardHeader onMenuClick={() => setIsMenuOpen(true)} portal={portal} />
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
