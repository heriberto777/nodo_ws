const { db } = require("./index");

const createMessage = async ({ lineId, direction, to, from, body }) => {
  const result = await db.query(
    "INSERT INTO messages (line_id, direction, to_number, from_number, body) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [lineId, direction, to, from, body]
  );
  return result.rows[0];
};

module.exports = { createMessage };
