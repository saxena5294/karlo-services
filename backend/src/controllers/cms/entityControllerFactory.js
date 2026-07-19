import { createEntity, getEntity, listEntities, replaceCmsImage, softDeleteEntity, updateEntity, validateOptionalService } from "../../services/cmsService.js";
import { assertAllowedFields, cleanBoolean, cleanDate, cleanEnum, cleanLink, cleanNumber, cleanStatus, cleanText } from "../../services/cmsValidation.js";
import { writeAuditLog } from "../../services/auditService.js";
import { ApiError } from "../../utils/ApiError.js";
import { FAQ_AUDIENCES, FAQ_CATEGORIES } from "../../models/faqModel.js";

const fields = {
  banner: ["title", "description", "buttonText", "buttonLink", "position", "order", "isActive", "status", "startAt", "endAt"],
  faq: ["question", "answer", "category", "displayOrder", "order", "isFeatured", "isActive", "audience", "keywords", "status"],
  testimonial: ["customerName", "customerRole", "message", "rating", "serviceId", "order", "isActive", "status"],
};

const sanitize = async (type, body, creating = false) => {
  assertAllowedFields(body, fields[type]);
  const output = {};
  const textRules = type === "banner"
    ? { title: [180, creating], description: [600], buttonText: [80] }
    : type === "faq"
      ? { question: [300, creating], answer: [3000, creating], category: [80] }
      : { customerName: [120, creating], customerRole: [120], message: [1500, creating] };

  for (const [key, [max, required = false]] of Object.entries(textRules)) {
    if (body[key] !== undefined || required) output[key] = cleanText(body[key], key, { required, max });
  }
  if (body.buttonLink !== undefined) output.buttonLink = cleanLink(body.buttonLink, "buttonLink");
  if (body.position !== undefined) output.position = cleanEnum(body.position, "position", ["homepage", "services", "dashboard"]);
  if (body.status !== undefined) output.status = cleanStatus(body.status);
  if (body.isActive !== undefined) output.isActive = cleanBoolean(body.isActive, "isActive");
  if (body.order !== undefined) output.order = cleanNumber(body.order, "order", 0, 100000);
  if (type === "faq") {
    if (body.category !== undefined) output.category = cleanEnum(body.category, "category", FAQ_CATEGORIES);
    if (body.displayOrder !== undefined) { output.displayOrder = cleanNumber(body.displayOrder, "displayOrder", 0, 100000); output.order = output.displayOrder; }
    if (body.isFeatured !== undefined) output.isFeatured = cleanBoolean(body.isFeatured, "isFeatured");
    if (body.audience !== undefined) {
      if (!Array.isArray(body.audience) || !body.audience.length || new Set(body.audience).size !== body.audience.length) throw new ApiError(400, "audience must contain one or more unique values");
      output.audience = body.audience.map((value) => cleanEnum(value, "audience", FAQ_AUDIENCES));
    }
    if (body.keywords !== undefined) {
      if (!Array.isArray(body.keywords) || body.keywords.length > 20) throw new ApiError(400, "keywords must be an array of at most 20 values");
      output.keywords = [...new Set(body.keywords.map((value) => cleanText(value, "keyword", { max: 60 }).toLowerCase()).filter(Boolean))];
    }
  }
  if (body.rating !== undefined || (creating && type === "testimonial")) output.rating = cleanNumber(body.rating, "rating", 1, 5);
  if (body.startAt !== undefined) output.startAt = cleanDate(body.startAt, "startAt");
  if (body.endAt !== undefined) output.endAt = cleanDate(body.endAt, "endAt");
  if (output.startAt && output.endAt && output.endAt <= output.startAt) throw new ApiError(400, "endAt must be later than startAt");
  if (type === "testimonial" && body.serviceId !== undefined) output.serviceId = await validateOptionalService(body.serviceId);
  return output;
};

const wrapper = (handler) => async (req, res, next) => {
  try {
    const { status = 200, message, data } = await handler(req);
    return res.status(status).json({ success: true, message, data });
  } catch (error) {
    return next(error);
  }
};

export const createEntityController = (type) => ({
  list: wrapper(async (req) => ({
    message: `${type}s fetched successfully`,
    data: await listEntities(type, req.query),
  })),
  get: wrapper(async (req) => ({
    message: `${type} fetched successfully`,
    data: { item: await getEntity(type, req.params.id) },
  })),
  create: wrapper(async (req) => {
    const payload = await sanitize(type, req.body, true);
    const item = req.file
      ? await replaceCmsImage({
        file: req.file,
        folder: `${type}s`,
        oldImage: null,
        update: (image) => createEntity(type, { ...payload, image }, req.auth.userId),
      })
      : await createEntity(type, payload, req.auth.userId);
    await writeAuditLog({ req, action: `cms.${type}.create`, entityType: type, entityId: item._id, summary: `Created ${type}`, after: item });
    return { status: 201, message: `${type} created successfully`, data: { item } };
  }),
  update: wrapper(async (req) => {
    const current = await getEntity(type, req.params.id);
    const payload = await sanitize(type, req.body);
    if (type === "banner") {
      const start = payload.startAt !== undefined ? payload.startAt : current.startAt;
      const end = payload.endAt !== undefined ? payload.endAt : current.endAt;
      if (start && end && end <= start) throw new ApiError(400, "endAt must be later than startAt");
    }
    const before = current.toObject();
    const item = req.file
      ? await replaceCmsImage({
        file: req.file,
        folder: `${type}s`,
        oldImage: current.image,
        update: (image) => updateEntity(type, req.params.id, { ...payload, image }, req.auth.userId),
      })
      : await updateEntity(type, req.params.id, payload, req.auth.userId);
    await writeAuditLog({ req, action: req.file ? `cms.${type}.image_replace` : `cms.${type}.update`, entityType: type, entityId: item._id, summary: `Updated ${type}`, before, after: item });
    return { message: `${type} updated successfully`, data: { item } };
  }),
  status: wrapper(async (req) => {
    assertAllowedFields(req.body, type === "faq" ? ["status", "isActive", "isFeatured"] : ["status", "isActive"]);
    const payload = {};
    if (req.body.status !== undefined) payload.status = cleanStatus(req.body.status);
    if (req.body.isActive !== undefined) payload.isActive = cleanBoolean(req.body.isActive, "isActive");
    if (type === "faq" && req.body.isFeatured !== undefined) payload.isFeatured = cleanBoolean(req.body.isFeatured, "isFeatured");
    if (!Object.keys(payload).length) throw new ApiError(400, "status or isActive is required");
    const item = await updateEntity(type, req.params.id, payload, req.auth.userId);
    await writeAuditLog({ req, action: `cms.${type}.status`, entityType: type, entityId: item._id, summary: `Changed ${type} publication or active status`, after: payload });
    return { message: `${type} status updated successfully`, data: { item } };
  }),
  order: wrapper(async (req) => {
    assertAllowedFields(req.body, ["order"]);
    const order = cleanNumber(req.body.order, "order", 0, 100000);
    const item = await updateEntity(type, req.params.id, type === "faq" ? { order, displayOrder: order } : { order }, req.auth.userId);
    await writeAuditLog({ req, action: `cms.${type}.reorder`, entityType: type, entityId: item._id, summary: `Changed ${type} order`, after: { order: item.order } });
    return { message: `${type} order updated successfully`, data: { item } };
  }),
  remove: wrapper(async (req) => {
    const item = await softDeleteEntity(type, req.params.id, req.auth.userId);
    await writeAuditLog({ req, action: `cms.${type}.delete`, entityType: type, entityId: item._id, summary: `Soft deleted ${type}` });
    return { message: `${type} deleted successfully`, data: { item } };
  }),
});
