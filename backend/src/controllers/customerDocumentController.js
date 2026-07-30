import { writeAuditLog } from "../services/auditService.js";
import * as documentService from "../services/customerDocumentService.js";
import { ApiError } from "../utils/ApiError.js";

const response = (handler, status = 200) => async (req, res, next) => {
  try {
    const data = await handler(req);
    return res.status(status).set("Cache-Control", "no-store, private").json({ success: true, ...data });
  } catch (error) {
    return next(error);
  }
};

const audit = (req, action, document, summary, metadata = {}) => writeAuditLog({
  req,
  action,
  entityType: "customer_document",
  entityId: document._id || req.params.id,
  summary,
  metadata: {
    customerUserId: document.customerUserId,
    applicationIds: (document.applications || []).map((item) => String(item._id || item)),
    ...metadata,
  },
});

export const types = response(async () => documentService.listDocumentTypes());

export const upload = response(async (req) => {
  const document = await documentService.createCustomerDocument({
    userId: req.auth.userId,
    role: req.auth.role,
    payload: req.body,
    file: req.file,
  });
  await audit(req, "customer_document.upload", document, "Customer document uploaded", { documentType: document.documentType });
  return { document };
}, 201);

export const myDocuments = response(async (req) =>
  documentService.listCustomerDocuments({ userId: req.auth.userId, role: req.auth.role, query: req.query, mine: true }));

export const list = response(async (req) =>
  documentService.listCustomerDocuments({ userId: req.auth.userId, role: req.auth.role, query: req.query }));

export const details = response(async (req) => ({
  document: await documentService.getCustomerDocumentDetails({
    id: req.params.id,
    userId: req.auth.userId,
    role: req.auth.role,
    applicationId: req.query.applicationId,
  }),
}));

const access = (action) => response(async (req) => {
  const result = await documentService.createCustomerDocumentAccess({
    id: req.params.id,
    versionId: req.params.versionId,
    userId: req.auth.userId,
    role: req.auth.role,
    action,
    applicationId: req.query.applicationId,
  });
  await audit(req, `customer_document.${action}`, result.document, `Customer document ${action} authorized`, {
    versionId: req.params.versionId || null,
  });
  return result;
});

export const preview = access("preview");
export const download = access("download");
export const downloadVersion = access("download");

export const update = response(async (req) => {
  const document = await documentService.updateCustomerDocument({
    id: req.params.id,
    userId: req.auth.userId,
    role: req.auth.role,
    payload: req.body,
  });
  await audit(req, "customer_document.update", document, "Customer document metadata updated");
  return { document };
});

export const replace = response(async (req) => {
  const document = await documentService.replaceCustomerDocument({
    id: req.params.id,
    userId: req.auth.userId,
    role: req.auth.role,
    file: req.file,
    replacementReason: req.body.replacementReason,
  });
  await audit(req, "customer_document.replace", document, "Customer document replaced", { currentVersion: document.currentVersion });
  return { document };
}, 201);

export const versions = response(async (req) =>
  documentService.listCustomerDocumentVersions({
    id: req.params.id,
    userId: req.auth.userId,
    role: req.auth.role,
    applicationId: req.query.applicationId,
  }));

export const restoreVersion = response(async (req) => {
  const document = await documentService.restoreCustomerDocumentVersion({
    id: req.params.id,
    versionId: req.params.versionId,
    userId: req.auth.userId,
    role: req.auth.role,
    reason: req.body.reason,
  });
  await audit(req, "customer_document.version_restore", document, "Historical customer document version restored", {
    versionId: req.params.versionId,
    currentVersion: document.currentVersion,
  });
  return { document };
});

export const remove = response(async (req) => {
  const document = await documentService.deleteCustomerDocument({
    id: req.params.id,
    userId: req.auth.userId,
    role: req.auth.role,
  });
  await audit(req, "customer_document.delete", document, "Customer document soft-deleted");
  return { document };
});

export const restore = response(async (req) => {
  const document = await documentService.restoreCustomerDocument({
    id: req.params.id,
    userId: req.auth.userId,
    role: req.auth.role,
  });
  await audit(req, "customer_document.restore", document, "Customer document restored");
  return { document };
});

export const verify = response(async (req) => {
  const unexpected = Object.keys(req.body).filter((key) => !["status", "publicRemarks", "internalRemarks", "applicationId"].includes(key));
  if (unexpected.length) throw new ApiError(400, `Unexpected fields: ${unexpected.join(", ")}`);
  const document = await documentService.verifyCustomerDocument({
    id: req.params.id,
    userId: req.auth.userId,
    role: req.auth.role,
    status: req.body.status,
    publicRemarks: req.body.publicRemarks,
    internalRemarks: req.body.internalRemarks,
    applicationId: req.body.applicationId,
  });
  await audit(req, `customer_document.${document.verificationStatus}`, document, `Customer document marked ${document.verificationStatus}`);
  return { document };
});

const lockAction = (locked) => response(async (req) => {
  const document = await documentService.setCustomerDocumentLock({
    id: req.params.id,
    userId: req.auth.userId,
    role: req.auth.role,
    locked,
    reason: req.body.reason,
  });
  await audit(req, locked ? "customer_document.lock" : "customer_document.unlock", document, `Customer document ${locked ? "locked" : "unlocked"}`);
  return { document };
});

export const lock = lockAction(true);
export const unlock = lockAction(false);
