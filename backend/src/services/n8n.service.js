const axios = require("axios");
const env = require("../config/env");
const logger = require("../config/logger");
const { getSettings } = require("../models/settings.model");

const forwardInboundMessage = async (payload) => {
  let webhookUrl = env.n8nWebhookUrl;
  try {
    const settings = await getSettings();
    if (settings?.n8n_webhook_url) {
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
