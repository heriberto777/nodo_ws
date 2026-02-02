const Joi = require("joi");
const createError = require("http-errors");
const { getWarmupState, createWarmupState, updateWarmupState } = require("../models/warmup.model");

const updateSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  startDate: Joi.date().iso().optional(),
  limits: Joi.object().optional()
});

const getByLine = async (req, res) => {
  const lineId = Number(req.params.lineId);
  if (!Number.isFinite(lineId)) throw createError(400, "Invalid line id");
  let state = await getWarmupState(lineId);
  if (!state) {
    state = await createWarmupState({ lineId });
  }
  res.json(state);
};

const updateByLine = async (req, res) => {
  const lineId = Number(req.params.lineId);
  if (!Number.isFinite(lineId)) throw createError(400, "Invalid line id");
  const { error, value } = updateSchema.validate(req.body);
  if (error) throw createError(400, "Invalid payload");
  let state = await getWarmupState(lineId);
  if (!state) {
    state = await createWarmupState({ lineId, limits: value.limits });
  }
  const updated = await updateWarmupState(lineId, value);
  res.json(updated);
};

module.exports = { getByLine, updateByLine };
