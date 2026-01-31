const axios = require("axios");
const env = require("../config/env");
const logger = require("../config/logger");
const { getSettings } = require("../models/settings.model");
const { db } = require("../models/index");
const { getLineSettings } = require("../models/line.model");

const resolveWebhookUrl = async (lineId, event) => {
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

const forwardEvent = async ({ lineId, event, payload }) => {
  const { url, webhookBase64 } = await resolveWebhookUrl(lineId, event);
  if (!url) return;

  const body = {
    event,
    lineId,
    ...payload
  };

  if (webhookBase64) {
    body.webhookBase64 = true;
  }

  try {
    await axios.post(url, body, {
      headers: { "x-api-key": env.apiKey }
    });
  } catch (error) {
    logger.error("Failed to forward to n8n", { error: error.message });
  }
};

const forwardInboundMessage = async (payload) => {
  let webhookUrl = env.n8nWebhookUrl;
  let webhookEnabled = true;

  try {
    if (payload?.lineId) {
      const result = await db.query(
        "SELECT n8n_webhook_url, webhook_enabled FROM lines WHERE id = $1",
        [payload.lineId]
      );
      const lineWebhook = result.rows[0]?.n8n_webhook_url;
      webhookEnabled = Boolean(result.rows[0]?.webhook_enabled);
      if (lineWebhook) webhookUrl = lineWebhook;
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

  if (!webhookEnabled || !webhookUrl) return;

  try {
    await axios.post(webhookUrl, payload, {
      headers: { "x-api-key": env.apiKey }
    });
  } catch (error) {
    logger.error("Failed to forward to n8n", { error: error.message });
  }
};

module.exports = { forwardInboundMessage, forwardEvent };
