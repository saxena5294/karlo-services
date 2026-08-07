import { UserButton } from "@clerk/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthProfile } from "../../auth/authProfileContext";
import { destinationForProfile } from "../../auth/roleRouting";

const ApprovalPending = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuthProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const check = async () => {
    setBusy(true); setError("");
    try {
      const fresh = await refreshProfile();
      const destination = destinationForProfile(fresh);
      if (destination && destination !== "/approval-pending") navigate(destination, { replace: true, state: { profile: fresh } });
      else setError("Approval is still pending. Please check again after an administrator reviews your profile.");
    } catch (requestError) { setError(requestError.response?.data?.message || requestError.message || "Unable to refresh approval status."); }
    finally { setBusy(false); }
  };
  return <section className="mx-auto max-w-xl px-4 py-20 text-center"><div className="rounded-3xl border border-amber-200 bg-white p-8 shadow-sm"><div className="mx-auto flex w-fit items-center gap-3"><UserButton afterSignOutUrl="/" /><span className="text-sm text-slate-500">Signed in securely</span></div><h1 className="mt-6 text-3xl font-bold">Approval pending</h1><p className="mt-4 leading-7 text-slate-600">Your {profile?.role || "business"} registration is waiting for an administrator to review it. Dashboard access will unlock after approval.</p>{error && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}<div className="mt-7 flex flex-wrap justify-center gap-3"><button onClick={check} disabled={busy} className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Checking…" : "Check approval status"}</button>{profile?.role === "partner" && <Link to="/onboarding/partner" className="rounded-xl border border-blue-200 px-6 py-3 font-semibold text-blue-700">Complete / review onboarding</Link>}<Link to="/" className="rounded-xl border px-6 py-3 font-semibold">Home</Link></div></div></section>;
};

export default ApprovalPending;
