import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startRoleOnboarding } from "../../api/authApi";
import { useAuthProfile } from "../../auth/authProfileContext";
import { dashboardForRole } from "../../auth/roleRouting";

const choices = [
  { role: "customer", title: "Customer", note: "Use Karlo services for yourself. Access is immediate." },
  { role: "partner", title: "Partner", note: "Register your business. Admin approval is required." },
  { role: "expert", title: "Expert", note: "Submit your skills. Admin approval is required." },
];

const AuthOnboarding = () => {
  const navigate = useNavigate();
  const { loading, profile, error: profileError, refreshProfile } = useAuthProfile();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && profile?.role && profile.role !== "customer") {
      navigate("/auth/redirect", { replace: true });
    }
  }, [loading, navigate, profile]);

  const choose = async (role) => {
    setBusy(role); setError("");
    try {
      if (role === "customer") { navigate(dashboardForRole(role), { replace: true }); return; }
      await startRoleOnboarding(role);
      await refreshProfile();
      navigate(`/onboarding/${role}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Unable to start onboarding.");
      setBusy("");
    }
  };

  if (loading) return <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">Creating your secure profile...</div>;
  const visibleError = error || profileError;
  return <section className="mx-auto max-w-3xl px-4 py-14"><div className="text-center"><h1 className="text-3xl font-bold">How will you use Karlo Services?</h1><p className="mt-3 text-slate-500">Your selection is verified and stored in MongoDB. Admin accounts cannot be created here.</p></div>{visibleError && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{visibleError}</p>}<div className="mt-8 grid gap-4 md:grid-cols-3">{choices.map((choice) => <button key={choice.role} type="button" disabled={Boolean(busy) || Boolean(profileError)} onClick={() => choose(choice.role)} className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-blue-500 hover:shadow-md disabled:opacity-50"><span className="text-xl font-bold text-slate-900">{choice.title}</span><span className="mt-3 block text-sm leading-6 text-slate-500">{choice.note}</span><span className="mt-5 block text-sm font-semibold text-blue-700">{busy === choice.role ? "Please wait..." : `Continue as ${choice.title}`}</span></button>)}</div></section>;
};

export default AuthOnboarding;
