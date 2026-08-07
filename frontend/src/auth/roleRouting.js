export const dashboardForRole = (role) => {
  if (!["customer", "partner", "expert", "admin"].includes(role)) return null;
  return `/${role}/dashboard`;
};

const unavailableStatuses = new Set(["inactive", "rejected", "suspended"]);

export const destinationForProfile = (profile) => {
  if (!profile?.role || !profile?.status) return null;
  if (unavailableStatuses.has(profile.status)) return "/account-unavailable";
  if (profile.approval?.status === "rejected") return "/account-unavailable";
  if (["partner", "expert"].includes(profile.role)) {
    if (profile.status === "pending" || profile.approval?.status === "pending") return "/approval-pending";
    if (!["active", "approved"].includes(profile.status) || profile.approval?.status !== "approved") return "/account-unavailable";
  }
  return dashboardForRole(profile.role);
};

export const safeInternalRedirect = (value) => {
  const redirect = String(value || "").trim();
  if (!redirect.startsWith("/") || redirect.startsWith("//") || redirect.startsWith("/login")) return null;
  return redirect;
};
