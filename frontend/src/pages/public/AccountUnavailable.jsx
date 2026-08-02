import { UserButton } from "@clerk/react";
import { Link, useLocation } from "react-router-dom";

const AccountUnavailable = () => {
  const message = useLocation().state?.message || "This account is inactive, rejected, or suspended. Contact Karlo Services support for assistance.";
  return <section className="mx-auto max-w-xl px-4 py-20 text-center"><div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm"><div className="mx-auto w-fit"><UserButton afterSignOutUrl="/" /></div><h1 className="mt-6 text-3xl font-bold">Account unavailable</h1><p className="mt-4 leading-7 text-slate-600">{message}</p><Link to="/contact" className="mt-7 inline-block rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white">Contact support</Link></div></section>;
};

export default AccountUnavailable;
