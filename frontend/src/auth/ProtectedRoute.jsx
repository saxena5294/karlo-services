import { useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentProfile } from "../api/authApi";
import { dashboardForRole } from "./roleRouting";

const ProtectedRoute = ({ role, allowPending = false, children }) => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  const [state, setState] = useState({ loading: true, profile: null, error: "" });

  useEffect(() => {
    let current = true;
    if (!isLoaded || !isSignedIn) return () => { current = false; };
    const loadProfile = async () => {
      const token = await getToken();
      if (!token) throw new Error("Clerk session token is unavailable");
      return getCurrentProfile(token);
    };
    loadProfile()
      .then(({ profile }) => current && setState({ loading: false, profile, error: "" }))
      .catch((error) => current && setState({ loading: false, profile: null, error: error.response?.data?.message || error.message || "Unable to verify account access." }));
    return () => { current = false; };
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Verifying your secure session...</div>;
  if (!isSignedIn) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (state.loading) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Verifying your secure session...</div>;
  if (state.error) return <div className="mx-auto max-w-xl p-8 text-center"><h1 className="text-2xl font-bold">Access unavailable</h1><p className="mt-3 text-slate-600">{state.error}</p></div>;
  if (state.profile.role !== role) return <Navigate to={dashboardForRole(state.profile.role) || "/"} replace />;
  if (!allowPending && ["partner", "expert"].includes(role) && state.profile.status !== "approved") {
    return <Navigate to="/approval-pending" replace state={{ profile: state.profile }} />;
  }
  return children;
};

export default ProtectedRoute;
