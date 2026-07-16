import { IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import { getPartnerProfile } from "../../api/partnerApi";
import EmptyState from "../../components/dashboard/EmptyState";
import LoadingSkeleton from "../../components/dashboard/LoadingSkeleton";
import StatCard from "../../components/dashboard/StatCard";

const PartnerWallet = () => { const [profile, setProfile] = useState(null); const [error, setError] = useState(""); useEffect(() => { getPartnerProfile().then((response) => setProfile(response.profile)).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load wallet.")); }, []); if (error) return <EmptyState title="Wallet unavailable" description={error} />; if (!profile) return <LoadingSkeleton count={2} />; return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Partner wallet</h2><p className="mt-1 text-slate-500">Read-only development balance. Payments are not implemented yet.</p></div><div className="max-w-sm"><StatCard title="Wallet balance" value={`₹${profile.walletBalance}`} icon={IndianRupee} accent="emerald" /></div><p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No payment, withdrawal, settlement or transaction actions are available in this phase.</p></div>; };
export default PartnerWallet;

