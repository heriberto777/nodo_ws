const Joi = require("joi");
const createError = require("http-errors");
const { listAuditLogs } = require("../models/audit.model");

const listSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(500).optional()
});

const list = async (req, res) => {
  const { error, value } = listSchema.validate(req.query);
  if (error) throw createError(400, "Invalid query");
  const items = await listAuditLogs({ limit: value.limit || 100 });
  res.json(items);
};

module.exports = { list };
