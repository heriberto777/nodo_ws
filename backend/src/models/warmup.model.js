const { db } = require("./index");

const getWarmupState = async (lineId) => {
  const result = await db.query(
    "SELECT line_id, enabled, start_date, date_key, sent_today, limits, created_at, updated_at FROM warmup_states WHERE line_id = $1",
    [lineId]
  );
  return result.rows[0];
};

const createWarmupState = async ({ lineId, limits }) => {
  const result = await db.query(
    "INSERT INTO warmup_states (line_id, limits) VALUES ($1, $2) RETURNING line_id, enabled, start_date, date_key, sent_today, limits, created_at, updated_at",
    [lineId, limits || null]
  );
  return result.rows[0];
};

const updateWarmupState = async (lineId, { enabled, startDate, limits }) => {
  const result = await db.query(
    "UPDATE warmup_states SET enabled = COALESCE($1, enabled), start_date = COALESCE($2, start_date), limits = COALESCE($3, limits), updated_at = NOW() WHERE line_id = $4 RETURNING line_id, enabled, start_date, date_key, sent_today, limits, created_at, updated_at",
    [enabled ?? null, startDate ?? null, limits ?? null, lineId]
  );
  return result.rows[0];
};

const resetDaily = async (lineId, dateKey) => {
  const result = await db.query(
    "UPDATE warmup_states SET date_key = $1, sent_today = 0, updated_at = NOW() WHERE line_id = $2 RETURNING line_id, enabled, start_date, date_key, sent_today, limits, created_at, updated_at",
    [dateKey, lineId]
  );
  return result.rows[0];
};

const incrementSent = async (lineId, dateKey) => {
  const result = await db.query(
    "UPDATE warmup_states SET date_key = $1, sent_today = sent_today + 1, updated_at = NOW() WHERE line_id = $2 RETURNING line_id, enabled, start_date, date_key, sent_today, limits, created_at, updated_at",
    [dateKey, lineId]
  );
  return result.rows[0];
};

module.exports = {
  getWarmupState,
  createWarmupState,
  updateWarmupState,
  resetDaily,
  incrementSent
};
