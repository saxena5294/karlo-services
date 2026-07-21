import { ShieldCheck, Store } from "lucide-react";

const ExpertProfile = () => {
  const userId = import.meta.env.VITE_DEV_EXPERT_USER_ID || "dev_expert_001";
  const role = "expert";

  return (
    <div className="max-w-2xl"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Store size={28} /></span><h2 className="mt-5 text-2xl font-bold">Development expert profile</h2><p className="mt-2 leading-7 text-slate-500">This temporary identity supports expert workflow development.</p><dl className="mt-7 divide-y divide-slate-200 rounded-xl border border-slate-200"><div className="p-4 sm:flex sm:items-center sm:justify-between"><dt className="text-sm font-medium text-slate-500">Development user ID</dt><dd className="mt-1 break-all font-semibold sm:mt-0">{userId}</dd></div><div className="p-4 sm:flex sm:items-center sm:justify-between"><dt className="text-sm font-medium text-slate-500">Current role</dt><dd className="mt-1 font-semibold capitalize sm:mt-0">{role}</dd></div></dl><div className="mt-6 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><ShieldCheck className="mt-0.5 shrink-0" size={20} /><p>Expert account details and management will come from the future authentication integration and Admin Dashboard.</p></div></section></div>
  );
};

export default ExpertProfile;
