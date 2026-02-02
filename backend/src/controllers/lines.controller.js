const Joi = require("joi");
const createError = require("http-errors");
const {
  createLine,
  listLines,
  getLineById,
  updateStatus,
  updateWebhook,
  updateRateLimit,
  updateLineSettings,
  deleteLine
} = require("../models/line.model");
const sessionManager = require("../services/session.manager");
const { SESSION_STATUSES } = require("../utils/constants");

const lineSchema = Joi.object({
  name: Joi.string().min(2).required(),
  phone: Joi.string().min(6).required(),
  n8nWebhookUrl: Joi.string().allow("", null),
  rateLimitMinute: Joi.number().integer().min(1).max(1000).allow(null),
  rateLimitHour: Joi.number().integer().min(1).max(50000).allow(null),
  rateLimitDay: Joi.number().integer().min(1).max(500000).allow(null),
  webhookEnabled: Joi.boolean().optional(),
  webhookBase64: Joi.boolean().optional(),
  ignoreGroups: Joi.boolean().optional(),
  readMessages: Joi.boolean().optional()
});

const webhookSchema = Joi.object({
  n8nWebhookUrl: Joi.string().allow("", null).required()
});

const rateLimitSchema = Joi.object({
  rateLimitMinute: Joi.number().integer().min(1).max(1000).required(),
  rateLimitHour: Joi.number().integer().min(1).max(50000).required(),
  rateLimitDay: Joi.number().integer().min(1).max(500000).required()
});

const lineSettingsSchema = Joi.object({
  webhookEnabled: Joi.boolean().required(),
  webhookBase64: Joi.boolean().required(),
  n8nWebhookUrl: Joi.string().allow("", null).required(),
  ignoreGroups: Joi.boolean().required(),
  readMessages: Joi.boolean().required()
});

const create = async (req, res) => {
  const { error } = lineSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  const payload = {
    ...req.body,
    webhookEnabled: req.body.webhookEnabled ?? Boolean(req.body.n8nWebhookUrl),
    webhookBase64: req.body.webhookBase64 ?? false,
    ignoreGroups: req.body.ignoreGroups ?? true,
    readMessages: req.body.readMessages ?? true
  };

  const line = await createLine(payload);
  res.status(201).json(line);
};

const list = async (req, res) => {
  const lines = await listLines();
  const enriched = lines.map((line) => ({
    ...line,
    safeMode: sessionManager.getSafeModeInfo(line.id)
  }));
  res.json(enriched);
};

const connect = async (req, res) => {
  const { id } = req.params;
  const line = await getLineById(id);
  if (!line) throw createError(404, "Line not found");
  const session = await sessionManager.connect(id);
  if (session.initializing || session.ready) {
    return res.status(409).json({ lineId: id, status: session.status });
  }
  res.json({ lineId: id, status: session.status || SESSION_STATUSES.CREATED });
};

const disconnect = async (req, res) => {
  const { id } = req.params;
  const line = await getLineById(id);
  if (!line) throw createError(404, "Line not found");
  const session = await sessionManager.disconnect(id);
  if (!session) {
    await updateStatus(id, SESSION_STATUSES.DISCONNECTED);
    return res.json({ lineId: id, status: SESSION_STATUSES.DISCONNECTED });
  }
  res.json({ lineId: id, status: session.status });
};

const updateLineWebhook = async (req, res) => {
  const { error } = webhookSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  const updated = await updateWebhook(req.params.id, req.body.n8nWebhookUrl);
  if (!updated) throw createError(404, "Line not found");
  res.json(updated);
};

const updateLineRateLimit = async (req, res) => {
  const { error } = rateLimitSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  const updated = await updateRateLimit(req.params.id, req.body);
  if (!updated) throw createError(404, "Line not found");
  res.json(updated);
};

const getSettings = async (req, res) => {
  const line = await getLineById(req.params.id);
  if (!line) throw createError(404, "Line not found");

  res.json({
    id: line.id,
    name: line.name,
    phone: line.phone,
    n8nWebhookUrl: line.n8n_webhook_url || "",
    webhookEnabled: Boolean(line.webhook_enabled),
    webhookBase64: Boolean(line.webhook_base64),
    ignoreGroups: Boolean(line.ignore_groups),
    readMessages: Boolean(line.read_messages),
    rateLimitMinute: line.rate_limit_minute || 15,
    rateLimitHour: line.rate_limit_hour || 300,
    rateLimitDay: line.rate_limit_day || 1000
  });
};

const updateSettings = async (req, res) => {
  const { error } = lineSettingsSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  const updated = await updateLineSettings(req.params.id, req.body);
  if (!updated) throw createError(404, "Line not found");
  await sessionManager.refreshSettings(req.params.id);
  res.json(updated);
};

const remove = async (req, res) => {
  const { id } = req.params;
  await sessionManager.removeSession(id);
  const deleted = await deleteLine(id);
  if (!deleted) throw createError(404, "Line not found");
  res.json({ ok: true });
};

const getQr = async (req, res) => {
  const line = await getLineById(req.params.id);
  if (!line) throw createError(404, "Line not found");
  const infoBefore = sessionManager.getSessionInfo(`${line.id}`);
  if (!infoBefore || (!infoBefore.initializing && !infoBefore.ready && !infoBefore.lastError)) {
    try {
      await sessionManager.connect(`${line.id}`);
    } catch (error) {
      // ignore to allow returning diagnostics
    }
  }
  const qr = sessionManager.getLastQr(`${line.id}`);
  const info = sessionManager.getSessionInfo(`${line.id}`);
  res.json({ qr, info });
};

const resetQr = async (req, res) => {
  const line = await getLineById(req.params.id);
  if (!line) throw createError(404, "Line not found");
  const session = sessionManager.getSession(`${line.id}`);
  if (session) {
    await sessionManager.resetAndConnect(`${line.id}`);
  } else {
    await sessionManager.connect(`${line.id}`);
  }
  res.json({ ok: true });
};

const listActiveSessions = async (_req, res) => {
  res.json(sessionManager.listActiveSessions());
};

const cleanupSession = async (req, res) => {
  const line = await getLineById(req.params.id);
  if (!line) throw createError(404, "Line not found");
  const ok = await sessionManager.cleanupSession(`${line.id}`);
  res.json({ ok });
};

const getSafeMode = async (req, res) => {
  const line = await getLineById(req.params.id);
  if (!line) throw createError(404, "Line not found");
  res.json(sessionManager.getSafeModeInfo(line.id));
};

const resetSafeMode = async (req, res) => {
  const line = await getLineById(req.params.id);
  if (!line) throw createError(404, "Line not found");
  sessionManager.clearSafeMode(line.id);
  res.json({ ok: true });
};

module.exports = {
  create,
  list,
  connect,
  disconnect,
  updateLineWebhook,
  updateLineRateLimit,
  getSettings,
  updateSettings,
  remove,
  getSafeMode,
  resetSafeMode,
  getQr,
  resetQr,
  listActiveSessions,
  cleanupSession
};
