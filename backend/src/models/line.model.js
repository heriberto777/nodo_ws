const { db } = require("./index");
const { SESSION_STATUSES } = require("../utils/constants");

const createLine = async ({
  name,
  phone,
  n8nWebhookUrl,
  rateLimitMinute,
  rateLimitHour,
  rateLimitDay,
  webhookEnabled,
  webhookBase64,
  ignoreGroups,
  readMessages
}) => {
  const result = await db.query(
    "INSERT INTO lines (name, phone, n8n_webhook_url, rate_limit_minute, rate_limit_hour, rate_limit_day, webhook_enabled, webhook_base64, ignore_groups, read_messages, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
    [
      name,
      phone,
      n8nWebhookUrl || null,
      rateLimitMinute ?? null,
      rateLimitHour ?? null,
      rateLimitDay ?? null,
      Boolean(webhookEnabled),
      Boolean(webhookBase64),
      Boolean(ignoreGroups),
      Boolean(readMessages),
      SESSION_STATUSES.CREATED
    ]
  );
  return result.rows[0];
};

const listLines = async () => {
  const result = await db.query("SELECT * FROM lines ORDER BY id DESC", []);
  return result.rows;
};

const getLineById = async (id) => {
  const result = await db.query("SELECT * FROM lines WHERE id = $1", [id]);
  return result.rows[0];
};

const updateStatus = async (id, status) => {
  const result = await db.query(
    "UPDATE lines SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, id]
  );
  return result.rows[0];
};

const updateWebhook = async (id, n8nWebhookUrl) => {
  const result = await db.query(
    "UPDATE lines SET n8n_webhook_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [n8nWebhookUrl, id]
  );
  return result.rows[0];
};

const updateRateLimit = async (id, { rateLimitMinute, rateLimitHour, rateLimitDay }) => {
  const result = await db.query(
    "UPDATE lines SET rate_limit_minute = $1, rate_limit_hour = $2, rate_limit_day = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
    [rateLimitMinute, rateLimitHour, rateLimitDay, id]
  );
  return result.rows[0];
};

const updateLineSettings = async (
  id,
  {
    webhookEnabled,
    webhookBase64,
    ignoreGroups,
    readMessages,
    n8nWebhookUrl
  }
) => {
  const result = await db.query(
    "UPDATE lines SET webhook_enabled = $1, webhook_base64 = $2, ignore_groups = $3, read_messages = $4, n8n_webhook_url = $5, updated_at = NOW() WHERE id = $6 RETURNING *",
    [
      Boolean(webhookEnabled),
      Boolean(webhookBase64),
      Boolean(ignoreGroups),
      Boolean(readMessages),
      n8nWebhookUrl || null,
      id
    ]
  );
  return result.rows[0];
};

const getLineRateLimits = async (id) => {
  const result = await db.query(
    "SELECT rate_limit_minute, rate_limit_hour, rate_limit_day FROM lines WHERE id = $1",
    [id]
  );
  return result.rows[0];
};

const getLineSettings = async (id) => {
  const result = await db.query(
    "SELECT webhook_enabled, webhook_base64, ignore_groups, read_messages, n8n_webhook_url FROM lines WHERE id = $1",
    [id]
  );
  return result.rows[0];
};

const deleteLine = async (id) => {
  await db.query("DELETE FROM messages WHERE line_id = $1", [id]);
  const result = await db.query("DELETE FROM lines WHERE id = $1 RETURNING *", [id]);
  return result.rows[0];
};

module.exports = {
  createLine,
  listLines,
  getLineById,
  updateStatus,
  updateWebhook,
  updateRateLimit,
  updateLineSettings,
  getLineRateLimits,
  getLineSettings,
  deleteLine
};
