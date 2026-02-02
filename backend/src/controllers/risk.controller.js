const Joi = require("joi");
const createError = require("http-errors");
const { listRiskEvents, getRiskStats } = require("../models/risk.model");
const { db } = require("../models/index");

const listSchema = Joi.object({
  lineId: Joi.number().integer().positive().optional(),
  limit: Joi.number().integer().min(1).max(200).optional()
});

const scoreSchema = Joi.object({
  lineId: Joi.number().integer().positive().required()
});

const list = async (req, res) => {
  const { error, value } = listSchema.validate(req.query);
  if (error) throw createError(400, "Invalid query");
  const items = await listRiskEvents({
    lineId: value.lineId,
    limit: value.limit || 50
  });
  res.json(items);
};

const score = async (req, res) => {
  const { error, value } = scoreSchema.validate(req.query);
  if (error) throw createError(400, "Invalid query");
  const stats = await getRiskStats({ lineId: value.lineId, windowMinutes: 60 });
  const scoreValue = stats.high * 5 + stats.medium * 2 + (stats.total - stats.high - stats.medium);
  res.json({ score: scoreValue, ...stats });
};

const scoreAll = async (req, res) => {
  const { error, value } = Joi.object({
    windowMinutes: Joi.number().integer().min(10).max(1440).optional()
  }).validate(req.query);
  if (error) throw createError(400, "Invalid query");

  const windowMinutes = value.windowMinutes || 60;
  const rows = await db.query(
    "SELECT line_id, COUNT(*)::int AS total, SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END)::int AS high, SUM(CASE WHEN severity = 'MEDIUM' THEN 1 ELSE 0 END)::int AS medium FROM risk_events WHERE created_at >= NOW() - ($1 * INTERVAL '1 minute') GROUP BY line_id",
    [windowMinutes]
  );

  const items = rows.rows.map((row) => ({
    lineId: row.line_id,
    total: row.total,
    high: row.high,
    medium: row.medium,
    score: row.high * 5 + row.medium * 2 + (row.total - row.high - row.medium)
  }));

  res.json(items);
};

module.exports = { list, score, scoreAll };
