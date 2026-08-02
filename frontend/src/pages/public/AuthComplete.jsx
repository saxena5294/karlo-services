import { useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentProfile } from "../../api/authApi";
import { destinationForProfile } from "../../auth/roleRouting";

const AuthComplete = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { navigate("/login", { replace: true }); return; }
    let current = true;
    const finish = async () => {
      const token = await getToken();
      if (!token) throw new Error("Clerk session token is unavailable");
      const { profile } = await getCurrentProfile(token);
      if (!current) return;
      const destination = destinationForProfile(profile);
      if (!destination) throw new Error("Your MongoDB account role could not be resolved");
      navigate(destination, { replace: true, state: { profile } });
    };
    finish().catch((requestError) => {
      if (!current) return;
      const message = requestError.response?.data?.message || requestError.message || "We could not resolve your account.";
      if (requestError.response?.status === 403) { navigate("/account-unavailable", { replace: true, state: { message } }); return; }
      setError(message);
    });
    return () => { current = false; };
  }, [getToken, isLoaded, isSignedIn, navigate]);

  return <section className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-2xl font-bold">Opening your dashboard</h1><p className={`mt-3 ${error ? "text-red-700" : "text-slate-500"}`}>{error || "Resolving your MongoDB role and approval status..."}</p></section>;
};

export default AuthComplete;
