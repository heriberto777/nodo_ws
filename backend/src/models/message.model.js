const { db } = require("./index");

const createMessage = async ({ lineId, direction, to, from, body }) => {
  const result = await db.query(
    "INSERT INTO messages (line_id, direction, to_number, from_number, body) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [lineId, direction, to, from, body]
  );
  return result.rows[0];
};

const listRecent = async (limit = 50) => {
  const result = await db.query(
    "SELECT id, line_id, direction, to_number, from_number, body, created_at FROM messages ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return result.rows;
};

module.exports = { createMessage, listRecent };
