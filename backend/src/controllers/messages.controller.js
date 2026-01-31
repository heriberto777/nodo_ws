const Joi = require("joi");
const createError = require("http-errors");
const { sendMessage } = require("../services/whatsapp.service");
const { checkRateLimit } = require("../services/ratelimit.service");
const { isAllowed } = require("../services/warmup.service");
const { createMessage } = require("../models/message.model");

const sendSchema = Joi.object({
  lineId: Joi.string().required(),
  to: Joi.string().required(),
  message: Joi.string().min(1).required()
});

const send = async (req, res) => {
  const { error } = sendSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  const { lineId, to, message } = req.body;

  if (!isAllowed(lineId)) {
    throw createError(429, "Warm-up limit exceeded");
  }

  try {
    await checkRateLimit(lineId);
  } catch (err) {
    throw createError(429, "Rate limit exceeded");
  }

  await sendMessage({ lineId, to, message });
  const record = await createMessage({
    lineId,
    direction: "OUT",
    to,
    from: lineId,
    body: message
  });

  res.status(201).json({ ok: true, message: record });
};

module.exports = { send };
