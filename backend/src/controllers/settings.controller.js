const Joi = require("joi");
const createError = require("http-errors");
const { getSettings, updateSettings } = require("../models/settings.model");

const settingsSchema = Joi.object({
  rateLimitMinute: Joi.number().integer().min(1).max(1000).required(),
  rateLimitHour: Joi.number().integer().min(1).max(50000).required(),
  rateLimitDay: Joi.number().integer().min(1).max(500000).required(),
  n8nWebhookUrl: Joi.string().allow("", null),
  alertWebhookUrl: Joi.string().allow("", null),
  alertWebhookEnabled: Joi.boolean().optional(),
  alertMinSeverity: Joi.string().valid("LOW", "MEDIUM", "HIGH").optional(),
  smtpHost: Joi.string().allow("", null).optional(),
  smtpPort: Joi.number().integer().min(1).max(65535).optional(),
  smtpUser: Joi.string().allow("", null).optional(),
  smtpPassword: Joi.string().allow("", null).optional(),
  smtpFrom: Joi.string().allow("", null).optional(),
  smtpTo: Joi.string().allow("", null).optional(),
  reportEnabled: Joi.boolean().optional(),
  reportCron: Joi.string().allow("", null).optional()
});

const get = async (req, res) => {
  const settings = await getSettings();
  if (!settings) throw createError(404, "Settings not found");

  res.json({
    rateLimitMinute: settings.rate_limit_minute,
    rateLimitHour: settings.rate_limit_hour,
    rateLimitDay: settings.rate_limit_day,
    n8nWebhookUrl: settings.n8n_webhook_url || "",
    alertWebhookUrl: settings.alert_webhook_url || "",
    alertWebhookEnabled: Boolean(settings.alert_webhook_enabled),
    alertMinSeverity: settings.alert_min_severity || "MEDIUM",
    smtpHost: settings.smtp_host || "",
    smtpPort: settings.smtp_port || "",
    smtpUser: settings.smtp_user || "",
    smtpFrom: settings.smtp_from || "",
    smtpTo: settings.smtp_to || "",
    reportEnabled: Boolean(settings.report_enabled),
    reportCron: settings.report_cron || "0 8 * * *",
    hasSmtpPassword: Boolean(settings.smtp_password)
  });
};

const update = async (req, res) => {
  const { error } = settingsSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  const payload = { ...req.body };
  if (payload.smtpPassword === "") {
    payload.smtpPassword = null;
  }
  const settings = await updateSettings(payload);
  if (!settings) throw createError(404, "Settings not found");

  res.json({
    rateLimitMinute: settings.rate_limit_minute,
    rateLimitHour: settings.rate_limit_hour,
    rateLimitDay: settings.rate_limit_day,
    n8nWebhookUrl: settings.n8n_webhook_url || "",
    alertWebhookUrl: settings.alert_webhook_url || "",
    alertWebhookEnabled: Boolean(settings.alert_webhook_enabled),
    alertMinSeverity: settings.alert_min_severity || "MEDIUM",
    smtpHost: settings.smtp_host || "",
    smtpPort: settings.smtp_port || "",
    smtpUser: settings.smtp_user || "",
    smtpFrom: settings.smtp_from || "",
    smtpTo: settings.smtp_to || "",
    reportEnabled: Boolean(settings.report_enabled),
    reportCron: settings.report_cron || "0 8 * * *",
    hasSmtpPassword: Boolean(settings.smtp_password)
  });
};

module.exports = { get, update };
