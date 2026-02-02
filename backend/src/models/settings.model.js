const { db } = require("./index");

const getSettings = async () => {
  const result = await db.query("SELECT * FROM settings WHERE id = 1", []);
  return result.rows[0];
};

const updateSettings = async ({
  rateLimitMinute,
  rateLimitHour,
  rateLimitDay,
  n8nWebhookUrl,
  alertWebhookUrl,
  alertWebhookEnabled,
  alertMinSeverity,
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPassword,
  smtpFrom,
  smtpTo,
  reportEnabled,
  reportCron
}) => {
  const result = await db.query(
    "UPDATE settings SET rate_limit_minute = $1, rate_limit_hour = $2, rate_limit_day = $3, n8n_webhook_url = $4, alert_webhook_url = $5, alert_webhook_enabled = $6, alert_min_severity = $7, smtp_host = COALESCE($8, smtp_host), smtp_port = COALESCE($9, smtp_port), smtp_user = COALESCE($10, smtp_user), smtp_password = COALESCE($11, smtp_password), smtp_from = COALESCE($12, smtp_from), smtp_to = COALESCE($13, smtp_to), report_enabled = COALESCE($14, report_enabled), report_cron = COALESCE($15, report_cron), updated_at = NOW() WHERE id = 1 RETURNING *",
    [
      rateLimitMinute,
      rateLimitHour,
      rateLimitDay,
      n8nWebhookUrl,
      alertWebhookUrl,
      Boolean(alertWebhookEnabled),
      alertMinSeverity,
      smtpHost ?? null,
      smtpPort ?? null,
      smtpUser ?? null,
      smtpPassword ?? null,
      smtpFrom ?? null,
      smtpTo ?? null,
      reportEnabled ?? null,
      reportCron ?? null
    ]
  );
  return result.rows[0];
};

module.exports = { getSettings, updateSettings };
