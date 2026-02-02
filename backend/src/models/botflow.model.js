const { db } = require("./index");

const listFlows = async () => {
  const result = await db.query(
    "SELECT id, name, description, definition, active, created_at, updated_at FROM bot_flows ORDER BY updated_at DESC",
    []
  );
  return result.rows;
};

const getFlowById = async (id) => {
  const result = await db.query(
    "SELECT id, name, description, definition, active, created_at, updated_at FROM bot_flows WHERE id = $1",
    [id]
  );
  return result.rows[0];
};

const getFirstActiveFlow = async () => {
  const result = await db.query(
    "SELECT id, name, description, definition, active, created_at, updated_at FROM bot_flows WHERE active = TRUE ORDER BY updated_at DESC LIMIT 1",
    []
  );
  return result.rows[0];
};

const createFlow = async ({ name, description, definition, active }) => {
  const result = await db.query(
    "INSERT INTO bot_flows (name, description, definition, active) VALUES ($1, $2, $3, $4) RETURNING id, name, description, definition, active, created_at, updated_at",
    [name, description || null, definition || null, active !== false]
  );
  return result.rows[0];
};

const updateFlow = async (id, { name, description, definition, active }) => {
  const result = await db.query(
    "UPDATE bot_flows SET name = COALESCE($1, name), description = COALESCE($2, description), definition = COALESCE($3, definition), active = COALESCE($4, active), updated_at = NOW() WHERE id = $5 RETURNING id, name, description, definition, active, created_at, updated_at",
    [name ?? null, description ?? null, definition ?? null, active ?? null, id]
  );
  return result.rows[0];
};

const deleteFlow = async (id) => {
  const result = await db.query("DELETE FROM bot_flows WHERE id = $1 RETURNING id", [id]);
  return result.rows[0];
};

module.exports = { listFlows, getFlowById, getFirstActiveFlow, createFlow, updateFlow, deleteFlow };
