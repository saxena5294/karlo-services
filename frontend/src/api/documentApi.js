import API from "./axiosInstance";

const data = (request) => request.then((response) => response.data);
const path = (applicationId, suffix = "") => `/applications/${encodeURIComponent(applicationId)}/documents${suffix}`;

export const getApplicationDocuments = (applicationId) => data(API.get(path(applicationId)));
export const getDocumentPreview = (applicationId, documentId) => data(API.get(path(applicationId, `/${encodeURIComponent(documentId)}/preview`)));
export const getDocumentDownload = (applicationId, documentId) => data(API.get(path(applicationId, `/${encodeURIComponent(documentId)}/download`)));
export const updateDocumentVerification = (applicationId, documentId, payload) => data(API.patch(path(applicationId, `/${encodeURIComponent(documentId)}/verification`), payload));
export const uploadDocumentReplacement = (applicationId, documentId, file, onUploadProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  return data(API.post(path(applicationId, `/${encodeURIComponent(documentId)}/replacement`), formData, { onUploadProgress }));
};
