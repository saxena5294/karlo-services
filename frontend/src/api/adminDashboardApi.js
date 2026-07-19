import API from "./axiosInstance";
const data = (request) => request.then((response) => response.data);
export const getAdminResources = (type) => data(API.get(`/admin/dashboard-modules/resources/${type}`));
export const createAdminResource = (type, payload) => data(API.post(`/admin/dashboard-modules/resources/${type}`, payload));
export const updateAdminResource = (type, id, payload) => data(API.patch(`/admin/dashboard-modules/resources/${type}/${encodeURIComponent(id)}`, payload));
