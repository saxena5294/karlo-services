import axios from "axios";
import { normalizeRole, ROLES } from "../constants/roles";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  timeout: 10000,
});

// TODO(Clerk): replace these development headers with Clerk token injection.
if (import.meta.env.DEV) {
  API.interceptors.request.use((config) => {
    config.headers.set(
      "x-dev-user-id",
      import.meta.env.VITE_DEV_USER_ID || "dev_customer_001"
    );
    config.headers.set(
      "x-dev-role",
      normalizeRole(import.meta.env.VITE_DEV_USER_ROLE || ROLES.CUSTOMER)
    );
    return config;
  });
}

export default API;
