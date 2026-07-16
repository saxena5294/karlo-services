export const ROLES = Object.freeze({
  CUSTOMER: "customer",
  EXPERT: "expert",
  PARTNER: "partner",
  ADMIN: "admin",
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

// Temporary input compatibility only. Canonical code and new records use "expert".
export const LEGACY_ROLE_ALIASES = Object.freeze({ retailer: ROLES.EXPERT });

export const normalizeRole = (role) => {
  const value = typeof role === "string" ? role.trim().toLowerCase() : "";
  return LEGACY_ROLE_ALIASES[value] || (ROLE_VALUES.includes(value) ? value : null);
};

