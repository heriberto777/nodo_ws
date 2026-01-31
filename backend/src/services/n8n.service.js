const axios = require("axios");
const env = require("../config/env");
const logger = require("../config/logger");
const { getSettings } = require("../models/settings.model");
const { db } = require("../models/index");
const { getLineSettings } = require("../models/line.model");

const resolveWebhookUrl = async (lineId) => {
  let webhookUrl = null;
  let webhookEnabled = false;
  let webhookBase64 = false;

  try {
    const lineConfig = await getLineSettings(lineId);
    webhookUrl = lineConfig?.n8n_webhook_url || null;
    webhookEnabled = Boolean(lineConfig?.webhook_enabled);
    webhookBase64 = Boolean(lineConfig?.webhook_base64);
  } catch (error) {
    logger.error("Failed to load line webhook", { error: error.message });
  }

  if (!webhookEnabled) {
    return { url: null, webhookBase64: false };
  }

  return { url: webhookUrl, webhookBase64 };
};

const forwardInboundMessage = async (payload) => {
  if (!payload?.lineId) return;

  const { url } = await resolveWebhookUrl(payload.lineId);
  if (!url) return;

  try {
    await axios.post(url, payload, {
      headers: { "x-api-key": env.apiKey }
    });
  } catch (error) {
    logger.error("Failed to forward to n8n", { error: error.message });
  }
};

module.exports = { forwardInboundMessage };
