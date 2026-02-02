const { db } = require("./index");

const createRiskEvent = async ({ lineId, type, severity, details }) => {
  const result = await db.query(
    "INSERT INTO risk_events (line_id, type, severity, details) VALUES ($1, $2, $3, $4) RETURNING id, line_id, type, severity, details, created_at",
    [lineId, type, severity, details || null]
  );
  return result.rows[0];
};

const listRiskEvents = async ({ lineId, limit = 50 }) => {
  const result = await db.query(
    "SELECT id, line_id, type, severity, details, created_at FROM risk_events WHERE ($1::int IS NULL OR line_id = $1) ORDER BY created_at DESC LIMIT $2",
    [lineId || null, limit]
  );
  return result.rows;
};

const getRiskStats = async ({ lineId, windowMinutes = 60 }) => {
  const result = await db.query(
    "SELECT COUNT(*)::int AS total, SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END)::int AS high, SUM(CASE WHEN severity = 'MEDIUM' THEN 1 ELSE 0 END)::int AS medium FROM risk_events WHERE line_id = $1 AND created_at >= NOW() - ($2 * INTERVAL '1 minute')",
    [lineId, windowMinutes]
  );
  return result.rows[0] || { total: 0, high: 0, medium: 0 };
};

module.exports = { createRiskEvent, listRiskEvents, getRiskStats };
