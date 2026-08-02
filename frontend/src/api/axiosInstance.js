import axios from "axios";
import { getClerkToken } from "../auth/clerkToken";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  timeout: 10000,
});

API.interceptors.request.use(async (config) => {
  const token = await getClerkToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

API.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401 && !window.location.pathname.startsWith("/login")) {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/login?redirect=${redirect}`);
  }
  return Promise.reject(error);
});

export default API;
