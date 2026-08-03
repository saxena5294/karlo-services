import axios from "axios";
import { getClerkToken } from "../auth/clerkToken";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  timeout: 10000,
});

API.interceptors.request.use(async (config) => {
  if (!config.headers.get("Authorization")) {
    const token = await getClerkToken();
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

export default API;
