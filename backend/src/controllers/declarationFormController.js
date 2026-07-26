import * as declarationForms from "../services/declarationFormService.js";

export const list = async (req, res, next) => {
  try {
    const result = await declarationForms.listDeclarationForms(req.auth.role, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

export const download = async (req, res, next) => {
  try {
    const fileUrl = await declarationForms.getDeclarationDownload(req.params.id, req.auth.role);
    return res.redirect(302, fileUrl);
  } catch (error) {
    return next(error);
  }
};

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
    const form = await declarationForms.adminCreateDeclarationForm(req.body, req.auth.userId);
    return res.status(201).json({ success: true, form });
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

