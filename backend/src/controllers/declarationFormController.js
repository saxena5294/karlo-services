import * as declarationForms from "../services/declarationFormService.js";

export const list = async (req, res, next) => {
  try {
    const result = await declarationForms.listDeclarationForms(req.auth.role, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

const safeFileName = (value) => String(value || "declaration.pdf")
  .replace(/[\r\n"]/g, "_")
  .slice(0, 200);

const deliverPdf = (attachment) => async (req, res, next) => {
  try {
    const file = await declarationForms.getDeclarationPdf(
      req.params.id,
      req.auth.role,
      attachment,
    );
    const fileName = safeFileName(file.fileName);
    res.set({
      "Content-Type": file.mimeType,
      "Content-Length": file.buffer.length,
      "Content-Disposition": `${attachment ? "attachment" : "inline"}; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (attachment) {
      res.once("finish", () => {
        declarationForms.recordDeclarationDownload(req.params.id, req.auth.role)
          .catch((error) => console.error("Declaration download counter update failed", {
            declarationFormId: req.params.id,
            reason: error?.message || "Unknown error",
          }));
      });
    }
    return res.status(200).send(file.buffer);
  } catch (error) {
    return next(error);
  }
};

export const preview = deliverPdf(false);
export const download = deliverPdf(true);

export const adminList = async (req, res, next) => {
  try {
    const forms = await declarationForms.adminListDeclarationForms(req.query);
    return res.status(200).json({ success: true, forms });
  } catch (error) {
    return next(error);
  }
};

export const adminCreate = async (req, res, next) => {
  try {
    const form = await declarationForms.adminCreateDeclarationForm(
      req.body,
      req.file,
      req.auth.userId,
    );
    return res.status(201).json({ success: true, form });
  } catch (error) {
    return next(error);
  }
};

export const adminReplaceFile = async (req, res, next) => {
  try {
    const form = await declarationForms.adminReplaceDeclarationPdf(
      req.params.id,
      req.file,
      req.auth.userId,
    );
    return res.status(200).json({ success: true, form });
  } catch (error) {
    return next(error);
  }
};

export const adminUpdate = async (req, res, next) => {
  try {
    const form = await declarationForms.adminUpdateDeclarationForm(
      req.params.id,
      req.body,
      req.auth.userId,
    );
    return res.status(200).json({ success: true, form });
  } catch (error) {
    return next(error);
  }
};

export const adminDelete = async (req, res, next) => {
  try {
    await declarationForms.adminDeleteDeclarationForm(req.params.id);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};
