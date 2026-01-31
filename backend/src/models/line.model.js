const { db } = require("./index");
const { SESSION_STATUSES } = require("../utils/constants");

const createLine = async ({ name, phone }) => {
  const result = await db.query(
    "INSERT INTO lines (name, phone, status) VALUES ($1, $2, $3) RETURNING *",
    [name, phone, SESSION_STATUSES.CREATED]
  );
  return result.rows[0];
};

const listLines = async () => {
  const result = await db.query("SELECT * FROM lines ORDER BY id DESC", []);
  return result.rows;
};

const updateStatus = async (id, status) => {
  const result = await db.query(
    "UPDATE lines SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, id]
  );
  return result.rows[0];
};

module.exports = {
  createLine,
  listLines,
  updateStatus
};
