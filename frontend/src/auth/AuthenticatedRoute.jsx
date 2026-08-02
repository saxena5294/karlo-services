import { useAuth } from "@clerk/react";
import { Navigate, useLocation } from "react-router-dom";

const AuthenticatedRoute = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  if (!isLoaded) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading secure session...</div>;
  if (!isSignedIn) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
};

export default AuthenticatedRoute;
