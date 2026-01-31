const axios = require("axios");
const env = require("../config/env");
const logger = require("../config/logger");
const { getSettings } = require("../models/settings.model");
const { db } = require("../models/index");
const { getLineWebhookConfig } = require("../models/line.model");

const resolveWebhookUrl = async (lineId, event) => {
  let webhookUrl = null;
  let webhookByEvent = false;
  let webhookEnabled = false;
  let webhookEvents = [];
  let webhookBase64 = false;

  try {
    const lineConfig = await getLineWebhookConfig(lineId);
    webhookUrl = lineConfig?.n8n_webhook_url || null;
    webhookEnabled = Boolean(lineConfig?.webhook_enabled);
    webhookByEvent = Boolean(lineConfig?.webhook_by_event);
    webhookEvents = lineConfig?.webhookEvents || [];
    webhookBase64 = Boolean(lineConfig?.webhook_base64);
  } catch (error) {
    logger.error("Failed to load line webhook", { error: error.message });
  }

  if (!webhookEnabled) {
    return { url: null, webhookBase64: false };
  }

  if (event && webhookEvents.length && !webhookEvents.includes(event)) {
    return { url: null, webhookBase64: false };
  }

  if (webhookUrl && webhookByEvent && event) {
    webhookUrl = `${webhookUrl.replace(/\/$/, "")}/${event}`;
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

module.exports = { forwardInboundMessage, forwardEvent };
