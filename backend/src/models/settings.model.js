const { db } = require("./index");

const getSettings = async () => {
  const result = await db.query("SELECT * FROM settings WHERE id = 1", []);
  return result.rows[0];
};

const updateSettings = async ({ rateLimitMinute, rateLimitHour, rateLimitDay, n8nWebhookUrl }) => {
  const result = await db.query(
    "UPDATE settings SET rate_limit_minute = $1, rate_limit_hour = $2, rate_limit_day = $3, n8n_webhook_url = $4, updated_at = NOW() WHERE id = 1 RETURNING *",
    [rateLimitMinute, rateLimitHour, rateLimitDay, n8nWebhookUrl]
  );
  return result.rows[0];
};

module.exports = { getSettings, updateSettings };
