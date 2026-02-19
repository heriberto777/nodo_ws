const Joi = require("joi");
const createError = require("http-errors");
const { checkRateLimit } = require("../services/ratelimit.service");
const { isAllowed } = require("../services/warmup.service");
const { listRecent } = require("../models/message.model");
const { enqueueOutboundMessage, getQueueMetrics } = require("../services/message-queue.service");

const sendSchema = Joi.object({
  lineId: Joi.string().required(),
  to: Joi.string().required(),
  message: Joi.string().min(1).required()
});

const send = async (req, res) => {
  const { error } = sendSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  const { lineId, to, message } = req.body;

  if (!(await isAllowed(lineId))) {
    throw createError(429, "Warm-up limit exceeded");
  }

  try {
    await checkRateLimit(lineId);
  } catch (err) {
    throw createError(429, "Rate limit exceeded");
  }

  const jobId = await enqueueOutboundMessage({ lineId, to, message, type: "text" });
  res.status(202).json({ ok: true, jobId });
};

const recent = async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const items = await listRecent(Math.min(limit, 200));
  res.json(items);
};

const queueStats = async (_req, res) => {
  const metrics = await getQueueMetrics();
  res.json(metrics);
};

module.exports = { send, recent, queueStats };
