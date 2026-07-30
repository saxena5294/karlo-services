import API from "./axiosInstance";

const result = (request) => request.then((response) => response.data);
const applicationPath = (id, suffix = "") => `/applications/${encodeURIComponent(id)}${suffix}`;

export const getApplicationWorkflow = (id) => result(API.get(applicationPath(id, "/workflow")));
export const createApplicationComment = (id, payload) => result(API.post(applicationPath(id, "/comments"), payload));
export const updateApplicationComment = (id, commentId, payload) =>
  result(API.patch(applicationPath(id, `/comments/${encodeURIComponent(commentId)}`), payload));
export const deleteApplicationComment = (id, commentId) =>
  result(API.delete(applicationPath(id, `/comments/${encodeURIComponent(commentId)}`)));
