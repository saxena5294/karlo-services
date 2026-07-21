import axios from "axios";
import { resolveDevelopmentIdentity } from "../auth/developmentAuth";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  timeout: 10000,
});

// TODO(Clerk): replace these development headers with Clerk token injection.
if (import.meta.env.DEV) {
  API.interceptors.request.use((config) => {
    const identity = resolveDevelopmentIdentity({
      pathname: window.location.pathname,
      storage: window.localStorage,
      env: import.meta.env,
    });
    config.headers.set("x-dev-user-id", identity.userId);
    config.headers.set("x-dev-role", identity.role);
    return config;
  });
}

export default API;
