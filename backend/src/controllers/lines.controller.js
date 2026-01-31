const Joi = require("joi");
const createError = require("http-errors");
const { createLine, listLines } = require("../models/line.model");
const sessionManager = require("../services/session.manager");
const { SESSION_STATUSES } = require("../utils/constants");

const lineSchema = Joi.object({
  name: Joi.string().min(2).required(),
  phone: Joi.string().min(6).required()
});

const create = async (req, res) => {
  const { error } = lineSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");

  const line = await createLine(req.body);
  res.status(201).json(line);
};

const list = async (req, res) => {
  const lines = await listLines();
  res.json(lines);
};

const connect = async (req, res) => {
  const { id } = req.params;
  const session = await sessionManager.connect(id);
  if (!session) throw createError(404, "Line not found");
  res.json({ lineId: id, status: session.status || SESSION_STATUSES.CREATED });
};

const disconnect = async (req, res) => {
  const { id } = req.params;
  const session = await sessionManager.disconnect(id);
  if (!session) throw createError(404, "Line not found");
  res.json({ lineId: id, status: session.status });
};

module.exports = { create, list, connect, disconnect };
