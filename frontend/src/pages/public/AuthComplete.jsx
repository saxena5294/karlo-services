import { useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentProfile, registerBusinessRole } from "../../api/authApi";

const AuthComplete = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { navigate("/login", { replace: true }); return; }
    let current = true;
    const finish = async () => {
      const requestedRole = params.get("role");
      let { profile } = await getCurrentProfile();
      if (["partner", "expert"].includes(requestedRole) && profile.role === "customer") {
        ({ profile } = await registerBusinessRole(requestedRole));
      }
      if (!current) return;
      if (requestedRole === "partner") { navigate("/onboarding/partner", { replace: true }); return; }
      if (requestedRole === "expert") { navigate("/onboarding/expert", { replace: true }); return; }
      if (!profile.profileComplete) { navigate("/profile/complete", { replace: true }); return; }
      navigate(profile.status === "pending" ? "/approval-pending" : `/${profile.role}/dashboard`, { replace: true, state: { profile } });
    };
    finish().catch((requestError) => current && setError(requestError.response?.data?.message || "We could not finish setting up your account."));
    return () => { current = false; };
  }, [isLoaded, isSignedIn, navigate, params]);

  return <section className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-2xl font-bold">Setting up your account</h1><p className={`mt-3 ${error ? "text-red-700" : "text-slate-500"}`}>{error || "Securely linking your Clerk session to your Karlo profile..."}</p></section>;
};

export default AuthComplete;
