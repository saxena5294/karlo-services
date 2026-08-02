import { UserButton } from "@clerk/react";
import { Link, useLocation } from "react-router-dom";

const ApprovalPending = () => {
  const profile = useLocation().state?.profile;
  return <section className="mx-auto max-w-xl px-4 py-20 text-center"><div className="rounded-3xl border border-amber-200 bg-white p-8 shadow-sm"><div className="mx-auto flex w-fit items-center gap-3"><UserButton afterSignOutUrl="/" /><span className="text-sm text-slate-500">Signed in securely</span></div><h1 className="mt-6 text-3xl font-bold">Approval pending</h1><p className="mt-4 leading-7 text-slate-600">Your {profile?.role || "business"} registration is waiting for an administrator to review it. Dashboard access will unlock after approval.</p><Link to="/" className="mt-7 inline-block rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white">Return home</Link></div></section>;
};

export default ApprovalPending;
