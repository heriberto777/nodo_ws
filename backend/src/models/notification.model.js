const { db } = require("./index");

const createNotification = async ({ lineId, type, severity, message }) => {
  const result = await db.query(
    "INSERT INTO notifications (line_id, type, severity, message) VALUES ($1, $2, $3, $4) RETURNING id, line_id, type, severity, message, is_read, created_at",
    [lineId, type, severity, message || null]
  );
  return result.rows[0];
};

const listNotifications = async ({ limit = 200 }) => {
  const result = await db.query(
    "SELECT id, line_id, type, severity, message, is_read, created_at FROM notifications ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return result.rows;
};

const markRead = async (id) => {
  const result = await db.query(
    "UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING id, line_id, type, severity, message, is_read, created_at",
    [id]
  );
  return result.rows[0];
};

const markAllRead = async () => {
  await db.query("UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE", []);
};

const clearAll = async () => {
  await db.query("DELETE FROM notifications", []);
};

const countUnread = async () => {
  const result = await db.query(
    "SELECT COUNT(*)::int AS count FROM notifications WHERE is_read = FALSE",
    []
  );
  return result.rows[0]?.count || 0;
};

module.exports = {
  createNotification,
  listNotifications,
  markRead,
  markAllRead,
  clearAll,
  countUnread
};
