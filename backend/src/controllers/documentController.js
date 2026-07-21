import { writeAuditLog } from "../services/auditService.js";
import {
  createDocumentAccess,
  DOCUMENT_ACTIONS,
  listApplicationDocuments,
  replaceApplicationDocument,
  updateDocumentVerification,
} from "../services/documentAccessService.js";

const noStore = (res) => res.set({ "Cache-Control": "no-store, private", Pragma: "no-cache" });

export const listDocuments = async (req, res, next) => {
  try {
    const result = await listApplicationDocuments({ applicationId: req.params.applicationId, userId: req.auth.userId, role: req.auth.role });
    return noStore(res).status(200).json({ success: true, ...result });
  } catch (error) { return next(error); }
};

const accessDocument = (action) => async (req, res, next) => {
  try {
    const result = await createDocumentAccess({ applicationId: req.params.applicationId, documentId: req.params.documentId, userId: req.auth.userId, role: req.auth.role, action });
    await writeAuditLog({ req, action: action === DOCUMENT_ACTIONS.PREVIEW ? "document_previewed" : "document_downloaded", entityType: "application_document", entityId: req.params.documentId, summary: `${action === DOCUMENT_ACTIONS.PREVIEW ? "Previewed" : "Downloaded"} an application document`, metadata: { applicationId: String(result.application._id) } });
    return noStore(res).status(200).json({ success: true, document: result.document, ...result.access });
  } catch (error) { return next(error); }
};

export const previewDocument = accessDocument(DOCUMENT_ACTIONS.PREVIEW);
export const downloadDocument = accessDocument(DOCUMENT_ACTIONS.DOWNLOAD);

export const verifyDocument = async (req, res, next) => {
  try {
    const document = await updateDocumentVerification({ applicationId: req.params.applicationId, documentId: req.params.documentId, userId: req.auth.userId, role: req.auth.role, status: req.body.status, remark: req.body.remark });
    const action = document.verificationStatus === "verified" ? "document_verified" : document.verificationStatus === "rejected" ? "document_rejected" : "document_reupload_requested";
    await writeAuditLog({ req, action, entityType: "application_document", entityId: document.id, summary: `Document review changed to ${document.verificationStatus}`, metadata: { applicationId: req.params.applicationId, verificationStatus: document.verificationStatus } });
    return noStore(res).status(200).json({ success: true, document });
  } catch (error) { return next(error); }
};

export const replaceDocument = async (req, res, next) => {
  try {
    const document = await replaceApplicationDocument({ applicationId: req.params.applicationId, documentId: req.params.documentId, userId: req.auth.userId, role: req.auth.role, file: req.file });
    await writeAuditLog({ req, action: "document_replaced", entityType: "application_document", entityId: document.id, summary: "Replacement application document uploaded", metadata: { applicationId: req.params.applicationId } });
    return noStore(res).status(201).json({ success: true, document });
  } catch (error) { return next(error); }
};
