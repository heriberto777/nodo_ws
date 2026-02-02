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
  message: Joi.string().min(1).required()
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
    message: req.body.message
  });

  const record = await createMessage({
    lineId: conversation.line_id,
    conversationId: conversation.id,
    direction: "OUT",
    to: conversation.contact,
    from: conversation.line_id,
    body: req.body.message
  });

  res.status(201).json({ ok: true, message: record });
};

module.exports = { list, getById, listMessages, updateStatus, reply };
