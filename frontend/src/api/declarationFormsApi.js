import API from "./axiosInstance";

const data = (request) => request.then((response) => response.data);

export const getDeclarationForms = (params = {}) => data(
  API.get("/declaration-forms", { params }),
);

export const downloadDeclarationForm = (id) => API.get(
  `/declaration-forms/${encodeURIComponent(id)}/download`,
  { responseType: "blob", timeout: 30000 },
);

export const getAdminDeclarationForms = (params = {}) => data(
  API.get("/admin/declaration-forms", { params }),
);

export const createAdminDeclarationForm = (payload) => data(
  API.post("/admin/declaration-forms", payload),
);

export const updateAdminDeclarationForm = (id, payload) => data(
  API.patch(`/admin/declaration-forms/${encodeURIComponent(id)}`, payload),
);

export const deleteAdminDeclarationForm = (id) => API.delete(
  `/admin/declaration-forms/${encodeURIComponent(id)}`,
);

