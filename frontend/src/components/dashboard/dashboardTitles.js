export const dashboardTitleForPortal = (portal) => ({
  admin: "Admin Dashboard",
  partner: "Partner Dashboard",
  expert: "Expert Dashboard",
  customer: "Customer Dashboard",
})[portal] || "Customer Dashboard";
