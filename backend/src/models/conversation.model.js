const { db } = require("./index");

const listConversations = async ({ lineId }) => {
  const result = await db.query(
    "SELECT id, line_id, contact, status, last_message_at, created_at, updated_at FROM conversations WHERE ($1::int IS NULL OR line_id = $1) ORDER BY updated_at DESC",
    [lineId || null]
  );
  return result.rows;
};

const getConversationById = async (id) => {
  const result = await db.query(
    "SELECT id, line_id, contact, status, last_message_at, created_at, updated_at FROM conversations WHERE id = $1",
    [id]
  );
  return result.rows[0];
};

const getOrCreateConversation = async ({ lineId, contact }) => {
  const existing = await db.query(
    "SELECT id, line_id, contact, status, last_message_at, created_at, updated_at FROM conversations WHERE line_id = $1 AND contact = $2",
    [lineId, contact]
  );
  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const created = await db.query(
    "INSERT INTO conversations (line_id, contact, status, last_message_at) VALUES ($1, $2, 'ACTIVE', NOW()) RETURNING id, line_id, contact, status, last_message_at, created_at, updated_at",
    [lineId, contact]
  );
  return created.rows[0];
};

const touchConversation = async (id) => {
  const result = await db.query(
    "UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, line_id, contact, status, last_message_at, created_at, updated_at",
    [id]
  );
  return result.rows[0];
};

const updateConversationStatus = async (id, status) => {
  const result = await db.query(
    "UPDATE conversations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, line_id, contact, status, last_message_at, created_at, updated_at",
    [status, id]
  );
  return result.rows[0];
};

module.exports = {
  listConversations,
  getConversationById,
  getOrCreateConversation,
  touchConversation,
  updateConversationStatus
};
