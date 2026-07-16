export const ROLES = Object.freeze({
  CUSTOMER: "customer",
  EXPERT: "expert",
  PARTNER: "partner",
  ADMIN: "admin",
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

export const normalizeRole = (role) => {
  const value = typeof role === "string" ? role.trim().toLowerCase() : "";
  return value === "retailer" ? ROLES.EXPERT : value;
};

