const { db } = require("./index");

const getStateByConversation = async (conversationId) => {
  const result = await db.query(
    "SELECT id, conversation_id, flow_id, state, data, created_at, updated_at FROM bot_states WHERE conversation_id = $1",
    [conversationId]
  );
  return result.rows[0];
};

const upsertState = async ({ conversationId, flowId, state, data }) => {
  const existing = await getStateByConversation(conversationId);
  if (existing) {
    const result = await db.query(
      "UPDATE bot_states SET flow_id = COALESCE($1, flow_id), state = COALESCE($2, state), data = COALESCE($3, data), updated_at = NOW() WHERE conversation_id = $4 RETURNING id, conversation_id, flow_id, state, data, created_at, updated_at",
      [flowId ?? null, state ?? null, data ?? null, conversationId]
    );
    return result.rows[0];
  }

  const result = await db.query(
    "INSERT INTO bot_states (conversation_id, flow_id, state, data) VALUES ($1, $2, $3, $4) RETURNING id, conversation_id, flow_id, state, data, created_at, updated_at",
    [conversationId, flowId || null, state || null, data || null]
  );
  return result.rows[0];
};

module.exports = { getStateByConversation, upsertState };
