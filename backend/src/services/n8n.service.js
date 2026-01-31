const axios = require("axios");
const env = require("../config/env");
const logger = require("../config/logger");
const { getSettings } = require("../models/settings.model");
const { db } = require("../models/index");

const forwardInboundMessage = async (payload) => {
  let webhookUrl = env.n8nWebhookUrl;

  try {
    if (payload?.lineId) {
      const result = await db.query("SELECT n8n_webhook_url FROM lines WHERE id = $1", [payload.lineId]);
      const lineWebhook = result.rows[0]?.n8n_webhook_url;
      if (lineWebhook) {
        webhookUrl = lineWebhook;
      }
    }
  } catch (error) {
    logger.error("Failed to load line webhook", { error: error.message });
  }
  try {
    const settings = await getSettings();
    if (settings?.n8n_webhook_url && !webhookUrl) {
      webhookUrl = settings.n8n_webhook_url;
    }
  } catch (error) {
    logger.error("Failed to load settings", { error: error.message });
  }

  if (!webhookUrl) return;

  try {
    await axios.post(webhookUrl, payload, {
      headers: { "x-api-key": env.apiKey }
    });
  } catch (error) {
    logger.error("Failed to forward to n8n", { error: error.message });
  }
};

module.exports = { forwardInboundMessage };
