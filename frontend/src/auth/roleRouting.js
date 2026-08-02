export const dashboardForRole = (role) => {
  if (!["customer", "partner", "expert", "admin"].includes(role)) return null;
  return `/${role}/dashboard`;
};

const unavailableStatuses = new Set(["inactive", "rejected", "suspended"]);

export const destinationForProfile = (profile) => {
  if (!profile?.role || !profile?.status) return null;
  if (unavailableStatuses.has(profile.status)) return "/account-unavailable";
  if (["partner", "expert"].includes(profile.role) && profile.status !== "approved") return "/approval-pending";
  return dashboardForRole(profile.role);
};
