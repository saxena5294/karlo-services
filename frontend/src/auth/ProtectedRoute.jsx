import { useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentProfile } from "../api/authApi";
import { destinationForProfile } from "./roleRouting";

const ProtectedRoute = ({ role, allowPending = false, children }) => {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const location = useLocation();
  const [state, setState] = useState({ loading: true, profile: null, error: "", status: null, userId: null });

  useEffect(() => {
    let current = true;
    if (!isLoaded || !isSignedIn) return () => { current = false; };
    const loadProfile = async () => {
      const token = await getToken();
      if (!token) throw new Error("Clerk session token is unavailable");
      const response = await getCurrentProfile(token);
      if (!response.profile) throw new Error("MongoDB account profile is unavailable");
      return response;
    };
    loadProfile()
      .then(({ profile }) => current && setState({ loading: false, profile, error: "", status: 200, userId }))
      .catch((error) => current && setState({ loading: false, profile: null, error: error.response?.data?.message || error.message || "Unable to verify account access.", status: error.response?.status || null, userId }));
    return () => { current = false; };
  }, [getToken, isLoaded, isSignedIn, userId]);

  if (!isLoaded) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Verifying your secure session...</div>;
  if (!isSignedIn) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (state.loading || state.userId !== userId) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Verifying your secure session...</div>;
  if (state.error) return <div className="mx-auto max-w-xl p-8 text-center"><h1 className="text-2xl font-bold">{state.status === 403 ? "Account access denied" : state.status === 401 ? "Session verification failed" : "Unable to verify account access"}</h1><p className="mt-3 text-slate-600">{state.error}</p><p className="mt-2 text-sm text-slate-500">Your Clerk session is still signed in. Please retry, or sign out and sign in again if the problem continues.</p></div>;
  const resolvedDestination = destinationForProfile(state.profile);
  if (resolvedDestination === "/account-unavailable") return <Navigate to={resolvedDestination} replace state={{ profile: state.profile }} />;
  if (state.profile.role !== role) return <Navigate to={resolvedDestination || "/"} replace />;
  if (!allowPending && resolvedDestination === "/approval-pending") {
    return <Navigate to="/approval-pending" replace state={{ profile: state.profile }} />;
  }
  return children;
};

export default ProtectedRoute;
