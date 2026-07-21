export const ROLES = Object.freeze({
  CUSTOMER: "customer",
  PARTNER: "partner",
  EXPERT: "expert",
  ADMIN: "admin",
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

export const normalizeRole = (role) => {
  const value = typeof role === "string" ? role.trim().toLowerCase() : "";
  return ROLE_VALUES.includes(value) ? value : null;
};
