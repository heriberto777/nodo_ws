const Joi = require("joi");
const createError = require("http-errors");
const { listFlows, getFlowById, createFlow, updateFlow, deleteFlow } = require("../models/botflow.model");

const createSchema = Joi.object({
  name: Joi.string().min(2).required(),
  description: Joi.string().allow("", null),
  definition: Joi.object().allow(null),
  active: Joi.boolean().optional()
});

const updateSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  description: Joi.string().allow("", null).optional(),
  definition: Joi.object().allow(null).optional(),
  active: Joi.boolean().optional()
});

const list = async (req, res) => {
  const flows = await listFlows();
  res.json(flows);
};

const getById = async (req, res) => {
  const flow = await getFlowById(req.params.id);
  if (!flow) throw createError(404, "Flow not found");
  res.json(flow);
};

const create = async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");
  const flow = await createFlow(value);
  res.status(201).json(flow);
};

const update = async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");
  const flow = await updateFlow(req.params.id, value);
  if (!flow) throw createError(404, "Flow not found");
  res.json(flow);
};

const remove = async (req, res) => {
  const removed = await deleteFlow(req.params.id);
  if (!removed) throw createError(404, "Flow not found");
  res.json({ ok: true });
};

module.exports = { list, getById, create, update, remove };
