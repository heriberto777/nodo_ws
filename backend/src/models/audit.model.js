const { db } = require("./index");

const createAuditLog = async ({ userId, action, resource, details }) => {
  const result = await db.query(
    "INSERT INTO audit_logs (user_id, action, resource, details) VALUES ($1, $2, $3, $4) RETURNING id, user_id, action, resource, details, created_at",
    [userId || null, action, resource, details || null]
  );
  return result.rows[0];
};

const listAuditLogs = async ({ limit = 100 }) => {
  const result = await db.query(
    "SELECT id, user_id, action, resource, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return result.rows;
};

module.exports = { createAuditLog, listAuditLogs };
