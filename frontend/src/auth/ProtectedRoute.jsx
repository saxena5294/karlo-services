import { useAuth } from "@clerk/react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthProfile } from "./authProfileContext";
import { destinationForProfile } from "./roleRouting";

const ProtectedRoute = ({ role, allowPending = false, children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  const { loading, profile, error, status } = useAuthProfile();

  if (!isLoaded) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Verifying your secure session...</div>;
  if (!isSignedIn) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Verifying your secure session...</div>;
  if (error) return <div className="mx-auto max-w-xl p-8 text-center"><h1 className="text-2xl font-bold">{status === 403 ? "Account access denied" : status === 401 ? "Session verification failed" : "Unable to verify account access"}</h1><p className="mt-3 text-slate-600">{error}</p><p className="mt-2 text-sm text-slate-500">Your Clerk session is still signed in. Please retry, or sign out and sign in again if the problem continues.</p></div>;
  const resolvedDestination = destinationForProfile(profile);
  if (resolvedDestination === "/account-unavailable") return <Navigate to={resolvedDestination} replace state={{ profile }} />;
  if (profile?.role !== role) return <Navigate to={resolvedDestination || "/"} replace />;
  if (!allowPending && resolvedDestination === "/approval-pending") {
    return <Navigate to="/approval-pending" replace state={{ profile }} />;
  }
  return children;
};

export default ProtectedRoute;
