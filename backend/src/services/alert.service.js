const axios = require("axios");
const logger = require("../config/logger");
const env = require("../config/env");
const { getSettings } = require("../models/settings.model");

const severityRank = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3
};

const shouldSend = (minSeverity, current) => {
  const minRank = severityRank[minSeverity] || 2;
  const currentRank = severityRank[current] || 1;
  return currentRank >= minRank;
};

const sendAlertWebhook = async (event) => {
  try {
    const settings = await getSettings();
    if (!settings?.alert_webhook_enabled) return;
    if (!settings?.alert_webhook_url) return;
    if (!shouldSend(settings.alert_min_severity, event.severity)) return;

    await axios.post(
      settings.alert_webhook_url,
      {
        type: event.type,
        severity: event.severity,
        lineId: event.line_id,
        details: event.details,
        createdAt: event.created_at
      },
      {
        headers: { "x-api-key": env.apiKey }
      }
    );
  } catch (error) {
    logger.error("Failed to send alert webhook", { error: error.message });
  }
};

module.exports = { sendAlertWebhook };
