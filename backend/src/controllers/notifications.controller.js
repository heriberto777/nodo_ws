const Joi = require("joi");
const createError = require("http-errors");
const {
  listNotifications,
  markRead,
  markAllRead,
  clearAll,
  countUnread
} = require("../models/notification.model");

const listSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(500).optional()
});

const list = async (req, res) => {
  const { error, value } = listSchema.validate(req.query);
  if (error) throw createError(400, "Invalid query");
  const items = await listNotifications({ limit: value.limit || 200 });
  res.json(items);
};

const markOneRead = async (req, res) => {
  const item = await markRead(req.params.id);
  if (!item) throw createError(404, "Notification not found");
  res.json(item);
};

const markAll = async (_req, res) => {
  await markAllRead();
  res.json({ ok: true });
};

const clear = async (_req, res) => {
  await clearAll();
  res.json({ ok: true });
};

const unread = async (_req, res) => {
  const count = await countUnread();
  res.json({ count });
};

module.exports = { list, markOneRead, markAll, clear, unread };
