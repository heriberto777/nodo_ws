const Joi = require("joi");
const createError = require("http-errors");
const { sendMessage } = require("../services/whatsapp.service");

const inboundSchema = Joi.object({
  lineId: Joi.string().required(),
  to: Joi.string().required(),
  message: Joi.string().required()
});

const inbound = async (req, res) => {
  const { error } = inboundSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  await sendMessage(req.body);
  res.json({ ok: true });
};

const status = async (req, res) => {
  res.json({ ok: true });
};

module.exports = { inbound, status };
