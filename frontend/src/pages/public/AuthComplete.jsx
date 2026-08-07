import { useAuth } from "@clerk/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthProfile } from "../../auth/authProfileContext";
import { destinationForProfile } from "../../auth/roleRouting";

const AuthComplete = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const { loading, profile, error } = useAuthProfile();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { navigate("/login", { replace: true }); return; }
    if (loading || error || !profile) return;
    const destination = destinationForProfile(profile);
    if (destination) navigate(destination, { replace: true, state: { profile } });
  }, [error, isLoaded, isSignedIn, loading, navigate, profile]);

  return <section className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-2xl font-bold">Opening your dashboard</h1><p className={`mt-3 ${error ? "text-red-700" : "text-slate-500"}`}>{error || "Resolving your MongoDB role and approval status..."}</p></section>;
};

export default AuthComplete;
