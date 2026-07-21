import { normalizeRole, ROLES } from "../constants/roles.js";

export const DEVELOPMENT_ROLE_KEY = "karlo_dev_role";

const DEFAULT_USER_IDS = Object.freeze({
  [ROLES.CUSTOMER]: "dev_customer_001",
  [ROLES.PARTNER]: "dev_partner_001",
  [ROLES.EXPERT]: "dev_expert_001",
  [ROLES.ADMIN]: "dev_admin_001",
});

export const roleForPath = (pathname = "") => {
  if (/^\/admin(?:\/|$)/.test(pathname)) return ROLES.ADMIN;
  if (/^\/partner(?:\/|$)/.test(pathname)) return ROLES.PARTNER;
  if (/^\/expert(?:\/|$)/.test(pathname)) return ROLES.EXPERT;
  if (/^\/customer(?:\/|$)/.test(pathname)) return ROLES.CUSTOMER;
  if (/^\/services\/[^/]+\/apply\/?$/.test(pathname)) return ROLES.CUSTOMER;
  return null;
};

export const resolveDevelopmentIdentity = ({ pathname = "", storage, env = {} } = {}) => {
  const savedValue = storage?.getItem(DEVELOPMENT_ROLE_KEY);
  const savedRole = normalizeRole(savedValue);
  if (savedValue && !savedRole) storage?.removeItem(DEVELOPMENT_ROLE_KEY);

  const routeRole = roleForPath(pathname);
  const role = routeRole || savedRole || ROLES.CUSTOMER;
  if (routeRole && routeRole !== savedRole) storage?.setItem(DEVELOPMENT_ROLE_KEY, routeRole);

  const envKey = `VITE_DEV_${role.toUpperCase()}_USER_ID`;
  const userId = String(env[envKey] || DEFAULT_USER_IDS[role]).trim();
  return Object.freeze({ userId, role });
};
