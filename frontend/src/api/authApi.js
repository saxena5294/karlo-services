import API from "./axiosInstance";
import { clerkSessionHeaders } from "../auth/authHeaders";

export const getCurrentProfile = async (token) => (await API.get(
  "/auth/me",
  token ? { headers: clerkSessionHeaders(token) } : undefined,
)).data;
export const updateCurrentProfile = async (payload) => (await API.patch("/auth/me", payload)).data;
export const startRoleOnboarding = async (role) => {
  if (!["partner", "expert"].includes(role)) throw new Error("Unsupported onboarding role");
  return (await API.post(`/auth/onboarding/${role}`)).data;
};
