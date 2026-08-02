import API from "./axiosInstance";

export const getCurrentProfile = async () => (await API.get("/auth/me")).data;
export const updateCurrentProfile = async (payload) => (await API.patch("/auth/me", payload)).data;
export const registerBusinessRole = async (role) => (await API.post("/auth/register-role", { role })).data;
