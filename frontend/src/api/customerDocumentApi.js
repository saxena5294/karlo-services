import API from "./axiosInstance";

const data = (request) => request.then((response) => response.data);
const path = (id, suffix = "") => `/customer-documents/${encodeURIComponent(id)}${suffix}`;

export const getCustomerDocumentTypes = () => data(API.get("/customer-documents/types"));
export const getMyCustomerDocuments = (params = {}) => data(API.get("/customer-documents/my", { params }));
export const getCustomerDocuments = (params = {}) => data(API.get("/customer-documents", { params }));
export const getCustomerDocument = (id, params = {}) => data(API.get(path(id), { params }));
export const uploadCustomerDocument = (payload, onUploadProgress) => {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") form.append(key, value);
  });
  return data(API.post("/customer-documents", form, { onUploadProgress }));
};
export const updateCustomerDocument = (id, payload) => data(API.put(path(id), payload));
export const getCustomerDocumentPreview = (id, params = {}) => data(API.get(path(id, "/preview"), { params }));
export const getCustomerDocumentDownload = (id, params = {}) => data(API.get(path(id, "/download"), { params }));
export const replaceCustomerDocument = (id, file, replacementReason, onUploadProgress) => {
  const form = new FormData();
  form.append("file", file);
  form.append("replacementReason", replacementReason);
  return data(API.post(path(id, "/replace"), form, { onUploadProgress }));
};
export const deleteCustomerDocument = (id) => data(API.delete(path(id)));
export const restoreCustomerDocument = (id) => data(API.post(path(id, "/restore")));
export const getCustomerDocumentVersions = (id, params = {}) => data(API.get(path(id, "/versions"), { params }));
export const downloadCustomerDocumentVersion = (id, versionId, params = {}) =>
  data(API.get(path(id, `/versions/${encodeURIComponent(versionId)}/download`), { params }));
export const restoreCustomerDocumentVersion = (id, versionId, reason) =>
  data(API.post(path(id, `/versions/${encodeURIComponent(versionId)}/restore`), { reason }));
export const verifyCustomerDocument = (id, payload) => data(API.patch(path(id, "/verify"), payload));
export const lockCustomerDocument = (id, reason) => data(API.patch(path(id, "/lock"), { reason }));
export const unlockCustomerDocument = (id, reason) => data(API.patch(path(id, "/unlock"), { reason }));
