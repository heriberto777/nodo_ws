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
  webhookByEvent,
  webhookEvents,
  webhookBase64,
  ignoreGroups,
  rejectCalls,
  readMessages,
  readStatus,
  syncHistory,
  alwaysOnline
}) => {
  const result = await db.query(
    "INSERT INTO lines (name, phone, n8n_webhook_url, rate_limit_minute, rate_limit_hour, rate_limit_day, webhook_enabled, webhook_by_event, webhook_events, webhook_base64, ignore_groups, reject_calls, read_messages, read_status, sync_history, always_online, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *",
    [
      name,
      phone,
      n8nWebhookUrl || null,
      rateLimitMinute ?? null,
      rateLimitHour ?? null,
      rateLimitDay ?? null,
      Boolean(webhookEnabled),
      Boolean(webhookByEvent),
      webhookEvents || null,
      Boolean(webhookBase64),
      Boolean(ignoreGroups),
      Boolean(rejectCalls),
      Boolean(readMessages),
      Boolean(readStatus),
      Boolean(syncHistory),
      Boolean(alwaysOnline),
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
    webhookByEvent,
    webhookBase64,
    ignoreGroups,
    rejectCalls,
    readMessages,
    readStatus,
    syncHistory,
    alwaysOnline,
    n8nWebhookUrl
  }
) => {
  const result = await db.query(
    "UPDATE lines SET webhook_enabled = $1, webhook_by_event = $2, webhook_base64 = $3, ignore_groups = $4, reject_calls = $5, read_messages = $6, read_status = $7, sync_history = $8, always_online = $9, n8n_webhook_url = $10, updated_at = NOW() WHERE id = $11 RETURNING *",
    [
      Boolean(webhookEnabled),
      Boolean(webhookByEvent),
      Boolean(webhookBase64),
      Boolean(ignoreGroups),
      Boolean(rejectCalls),
      Boolean(readMessages),
      Boolean(readStatus),
      Boolean(syncHistory),
      Boolean(alwaysOnline),
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
    "SELECT webhook_enabled, webhook_by_event, webhook_base64, ignore_groups, reject_calls, read_messages, read_status, sync_history, always_online, n8n_webhook_url FROM lines WHERE id = $1",
    [id]
  );
  return result.rows[0];
};

const replaceLineWebhookEvents = async (id, events = []) => {
  await db.query("DELETE FROM line_webhook_events WHERE line_id = $1", [id]);
  if (!events.length) return;

  const values = events.map((event, index) => `($1, $${index + 2})`).join(", ");
  await db.query(
    `INSERT INTO line_webhook_events (line_id, event) VALUES ${values}`,
    [id, ...events]
  );
};

const getLineWebhookEvents = async (id) => {
  const result = await db.query(
    "SELECT event FROM line_webhook_events WHERE line_id = $1 ORDER BY event",
    [id]
  );
  return result.rows.map((row) => row.event);
};

const getLineWebhookConfig = async (id) => {
  const settings = await getLineSettings(id);
  const events = await getLineWebhookEvents(id);
  return {
    ...settings,
    webhookEvents: events
  };
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
  replaceLineWebhookEvents,
  getLineWebhookEvents,
  getLineWebhookConfig,
  deleteLine
};
