const axios = require("axios");
const env = require("../config/env");
const logger = require("../config/logger");

const forwardInboundMessage = async (payload) => {
  if (!env.n8nWebhookUrl) return;

  try {
    await axios.post(env.n8nWebhookUrl, payload, {
      headers: { "x-api-key": env.apiKey }
    });
  } catch (error) {
    logger.error("Failed to forward to n8n", { error: error.message });
  }
};

module.exports = { forwardInboundMessage };
