const verificationStyles = {
  pending: "bg-amber-50 text-amber-800",
  under_review: "bg-violet-50 text-violet-800",
  verified: "bg-emerald-50 text-emerald-800",
  rejected: "bg-rose-50 text-rose-800",
  reupload_required: "bg-orange-50 text-orange-800",
};

const expiryStyles = {
  valid: "bg-emerald-50 text-emerald-800",
  expiring_soon: "bg-amber-50 text-amber-800",
  expired: "bg-rose-50 text-rose-800",
  no_expiry: "bg-slate-100 text-slate-700",
};

const badge = (value, styles) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[value] || "bg-slate-100 text-slate-700"}`}>
    {String(value || "unknown").replaceAll("_", " ")}
  </span>
);

export const VerificationBadge = ({ status }) => badge(status, verificationStyles);
export const ExpiryBadge = ({ status }) => badge(status, expiryStyles);
