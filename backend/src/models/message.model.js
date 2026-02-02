const { db } = require("./index");

const createMessage = async ({ lineId, conversationId, direction, to, from, body }) => {
  const result = await db.query(
    "INSERT INTO messages (line_id, conversation_id, direction, to_number, from_number, body) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [lineId, conversationId || null, direction, to, from, body]
  );
  return result.rows[0];
};

const listRecent = async (limit = 50) => {
  const result = await db.query(
    "SELECT id, line_id, conversation_id, direction, to_number, from_number, body, created_at FROM messages ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return result.rows;
};

const listByConversation = async (conversationId, limit = 50) => {
  const result = await db.query(
    "SELECT id, line_id, conversation_id, direction, to_number, from_number, body, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2",
    [conversationId, limit]
  );
  return result.rows;
};

module.exports = { createMessage, listRecent, listByConversation };
