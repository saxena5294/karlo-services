import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";
import { getExpertProfile } from "../../api/expertApi";
import { getPartnerProfile } from "../../api/partnerApi";

const DashboardLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [identity, setIdentity] = useState(null);
  const { pathname } = useLocation();
  const portal = pathname.startsWith("/admin")
    ? "admin"
    : pathname.startsWith("/partner")
      ? "partner"
    : pathname.startsWith("/expert")
      ? "expert"
      : "customer";

  useEffect(() => {
    let current = true;
    const request = portal === "expert" ? getExpertProfile() : portal === "partner" ? getPartnerProfile() : null;
    if (!request) return undefined;
    request.then((response) => {
      if (!current) return;
      const profile = response.profile;
      setIdentity({
        name: profile.displayName || profile.businessName || profile.ownerName,
        role: portal,
        isOnline: profile.isOnline ?? Boolean(profile.availability),
        assignedWorkCount: profile.assignedWorkCount,
        photoUrl: profile.photoUrl,
      });
    }).catch(() => current && setIdentity(null));
    return () => { current = false; };
  }, [portal]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <DashboardSidebar
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        portal={portal}
      />
      <div className="min-w-0 lg:pl-72">
        <DashboardHeader onMenuClick={() => setIsMenuOpen(true)} portal={portal} identity={identity?.role === portal ? identity : null} />
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
