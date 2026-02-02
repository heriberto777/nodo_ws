const Joi = require("joi");
const createError = require("http-errors");
const {
  listConversations,
  getConversationById,
  updateConversationStatus
} = require("../models/conversation.model");
const { listByConversation } = require("../models/message.model");
const { createMessage } = require("../models/message.model");
const { checkRateLimit } = require("../services/ratelimit.service");
const { isAllowed } = require("../services/warmup.service");
const { sendMessageWithDelay } = require("../services/whatsapp.service");

const listSchema = Joi.object({
  lineId: Joi.number().integer().positive().optional()
});

const statusSchema = Joi.object({
  status: Joi.string().valid("ACTIVE", "PAUSED", "CLOSED").required()
});

const replySchema = Joi.object({
  type: Joi.string().valid("text", "location").default("text"),
  message: Joi.string().allow("", null),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    name: Joi.string().allow("", null),
    address: Joi.string().allow("", null),
    url: Joi.string().allow("", null)
  }).optional()
}).custom((value, helpers) => {
  if (value.type === "text" && !value.message) {
    return helpers.error("any.invalid");
  }
  if (value.type === "location" && !value.location) {
    return helpers.error("any.invalid");
  }
  return value;
});

const list = async (req, res) => {
  const { error, value } = listSchema.validate(req.query);
  if (error) throw createError(400, "Invalid query");
  const items = await listConversations({ lineId: value.lineId });
  res.json(items);
};

const getById = async (req, res) => {
  const conversation = await getConversationById(req.params.id);
  if (!conversation) throw createError(404, "Conversation not found");
  res.json(conversation);
};

const listMessages = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const items = await listByConversation(req.params.id, limit);
  res.json(items);
};

const updateStatus = async (req, res) => {
  const { error } = statusSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");
  const updated = await updateConversationStatus(req.params.id, req.body.status);
  if (!updated) throw createError(404, "Conversation not found");
  res.json(updated);
};

const reply = async (req, res) => {
  const { error } = replySchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  const conversation = await getConversationById(req.params.id);
  if (!conversation) throw createError(404, "Conversation not found");

  if (!(await isAllowed(conversation.line_id))) {
    throw createError(429, "Warm-up limit exceeded");
  }

  try {
    await checkRateLimit(conversation.line_id);
  } catch (err) {
    throw createError(429, "Rate limit exceeded");
  }

  await sendMessageWithDelay({
    lineId: conversation.line_id,
    to: conversation.contact,
    message: req.body.message,
    type: req.body.type,
    location: req.body.location
  });

  const bodyText =
    req.body.type === "location"
      ? `📍 ${req.body.location?.name || "Ubicación"} (${req.body.location?.latitude}, ${req.body.location?.longitude})`
      : req.body.message;
  const record = await createMessage({
    lineId: conversation.line_id,
    conversationId: conversation.id,
    direction: "OUT",
    to: conversation.contact,
    from: conversation.line_id,
    body: bodyText
  });

  res.status(201).json({ ok: true, message: record });
};

module.exports = { list, getById, listMessages, updateStatus, reply };
