import { AuditLog } from "../models/auditLogModel.js";

const BLOCKED_KEYS = /(password|passcode|token|secret|authorization|cookie|publicid|secureurl|document|file|formdata|aadhaar|pan(number)?)/i;

export const sanitizeAuditValue = (value, depth = 0) => {
  if (value == null || depth > 5) return value == null ? value : "[redacted-depth]";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => sanitizeAuditValue(item, depth + 1));
  if (typeof value !== "object") return typeof value === "string" ? value.slice(0, 2000) : value;
  const source = typeof value.toObject === "function" ? value.toObject() : value;
  return Object.fromEntries(Object.entries(source)
    .filter(([key]) => !BLOCKED_KEYS.test(key))
    .map(([key, item]) => [key, sanitizeAuditValue(item, depth + 1)]));
};

export const writeAuditLog = ({ req, action, entityType, entityId, summary, before, after, metadata }) => AuditLog.create({
  actorUserId: req.auth.userId,
  actorRole: req.auth.role,
  action,
  entityType,
  entityId: String(entityId),
  summary,
  before: sanitizeAuditValue(before),
  after: sanitizeAuditValue(after),
  metadata: sanitizeAuditValue(metadata) || {},
  ipAddress: String(req.ip || req.socket?.remoteAddress || "").slice(0, 80),
  userAgent: String(req.get?.("user-agent") || "").slice(0, 300),
});

export const listAuditLogs = async (query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  const filter = {};
  if (query.action) filter.action = query.action;
  if (query.entityType) filter.entityType = query.entityType;
  if (query.actorUserId) filter.actorUserId = query.actorUserId.trim();
  const [auditLogs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  return { auditLogs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};
