import { writeAuditLog } from "../services/auditService.js";
import {
  createApplicationComment,
  deleteApplicationComment,
  getApplicationWorkflow,
  updateApplicationComment,
} from "../services/applicationWorkflowService.js";
import { ApiError } from "../utils/ApiError.js";

const assertBody = (body, allowed) => {
  const unexpected = Object.keys(body || {}).filter((key) => !allowed.includes(key));
  if (unexpected.length) throw new ApiError(400, `Unexpected fields: ${unexpected.join(", ")}`);
};

export const workflow = async (req, res, next) => {
  try {
    const result = await getApplicationWorkflow({ id: req.params.applicationId, userId: req.auth.userId, role: req.auth.role });
    return res.status(200).json({ success: true, workflow: result });
  } catch (error) { return next(error); }
};

export const createComment = async (req, res, next) => {
  try {
    assertBody(req.body, ["body", "visibility"]);
    const comment = await createApplicationComment({
      id: req.params.applicationId, userId: req.auth.userId, role: req.auth.role,
      body: req.body.body, visibility: req.body.visibility,
    });
    await writeAuditLog({ req, action: "application.comment_create", entityType: "application", entityId: req.params.applicationId, summary: `${comment.visibility} application comment added`, metadata: { commentId: comment._id } });
    return res.status(201).json({ success: true, comment });
  } catch (error) { return next(error); }
};

export const updateComment = async (req, res, next) => {
  try {
    assertBody(req.body, ["body", "visibility"]);
    const comment = await updateApplicationComment({
      id: req.params.applicationId, commentId: req.params.commentId, userId: req.auth.userId, role: req.auth.role,
      body: req.body.body, visibility: req.body.visibility,
    });
    await writeAuditLog({ req, action: "application.comment_update", entityType: "application_comment", entityId: comment._id, summary: "Application comment updated", metadata: { applicationId: String(comment.application) } });
    return res.status(200).json({ success: true, comment });
  } catch (error) { return next(error); }
};

export const deleteComment = async (req, res, next) => {
  try {
    const comment = await deleteApplicationComment({ id: req.params.applicationId, commentId: req.params.commentId, userId: req.auth.userId, role: req.auth.role });
    await writeAuditLog({ req, action: "application.comment_delete", entityType: "application_comment", entityId: comment._id, summary: "Application comment deleted", metadata: { applicationId: String(comment.application) } });
    return res.status(200).json({ success: true, comment });
  } catch (error) { return next(error); }
};
