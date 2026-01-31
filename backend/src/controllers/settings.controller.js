const Joi = require("joi");
const createError = require("http-errors");
const { getSettings, updateSettings } = require("../models/settings.model");

const settingsSchema = Joi.object({
  rateLimitMinute: Joi.number().integer().min(1).max(1000).required(),
  rateLimitHour: Joi.number().integer().min(1).max(50000).required(),
  rateLimitDay: Joi.number().integer().min(1).max(500000).required(),
  n8nWebhookUrl: Joi.string().allow("", null)
});

const get = async (req, res) => {
  const settings = await getSettings();
  if (!settings) throw createError(404, "Settings not found");

  res.json({
    rateLimitMinute: settings.rate_limit_minute,
    rateLimitHour: settings.rate_limit_hour,
    rateLimitDay: settings.rate_limit_day,
    n8nWebhookUrl: settings.n8n_webhook_url || ""
  });
};

const update = async (req, res) => {
  const { error } = settingsSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  const settings = await updateSettings(req.body);
  if (!settings) throw createError(404, "Settings not found");

  res.json({
    rateLimitMinute: settings.rate_limit_minute,
    rateLimitHour: settings.rate_limit_hour,
    rateLimitDay: settings.rate_limit_day,
    n8nWebhookUrl: settings.n8n_webhook_url || ""
  });
};

module.exports = { get, update };
