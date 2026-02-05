const Joi = require("joi");
const createError = require("http-errors");
const env = require("../config/env");
const logger = require("../config/logger");
const { sendMessage } = require("../services/whatsapp.service");
const { checkRateLimit } = require("../services/ratelimit.service");
const { isAllowed } = require("../services/warmup.service");
const { createMessage } = require("../models/message.model");
const { getOrCreateConversation, touchConversation } = require("../models/conversation.model");

const inboundSchema = Joi.object({
  lineId: Joi.string().required(),
  to: Joi.string().required(),
  message: Joi.string().min(1).required(),
  text: Joi.string().optional(),
  body: Joi.string().optional(),
  wa_id: Joi.string().optional()
});

/**
 * Webhook para recibir mensajes desde n8n
 * n8n envía el mensaje y este endpoint lo reenvía a WhatsApp
 * 
 * Ejemplo desde n8n:
 * POST /api/webhooks/inbound
 * Headers: x-api-key: tu_api_key
 * Body: {
 *   "lineId": "11",
 *   "to": "+5491234567890",
 *   "message": "Hola, esta es mi respuesta desde n8n"
 * }
 */
const inbound = async (req, res) => {
  // Validar API key si está configurada
  if (env.apiKey) {
    const apiKey = req.headers["x-api-key"] || req.query.api_key;
    if (!apiKey || apiKey !== env.apiKey) {
      logger.warn("Unauthorized webhook attempt", {
        ip: req.ip,
        path: req.path
      });
      throw createError(401, "Unauthorized - Invalid API key");
    }
  }

  const { error, value } = inboundSchema.validate(req.body);
  if (error) throw createError(400, `Invalid payload: ${error.message}`);

  const { lineId, to, message: messageText } = value;
  
  // message, text, o body pueden contener el mensaje
  const finalMessage = messageText || value.text || value.body;

  try {
    // Verificar warm-up limits
    if (!(await isAllowed(lineId))) {
      logger.warn("Warm-up limit exceeded for webhook", { lineId, to });
      throw createError(429, "Warm-up limit exceeded");
    }

    // Verificar rate limits
    try {
      await checkRateLimit(lineId);
    } catch (err) {
      logger.warn("Rate limit exceeded for webhook", { lineId, to });
      throw createError(429, "Rate limit exceeded");
    }

    // Obtener o crear conversación
    const conversation = await getOrCreateConversation({ lineId, contact: to });
    await touchConversation(conversation.id);

    // Enviar mensaje a WhatsApp
    await sendMessage({ lineId, to, message: finalMessage });

    // Registrar mensaje en BD
    const record = await createMessage({
      lineId,
      conversationId: conversation.id,
      direction: "OUT",
      to,
      from: lineId,
      body: finalMessage
    });

    logger.info("Webhook message sent successfully", {
      lineId,
      to,
      messageId: record.id,
      source: "n8n"
    });

    res.status(201).json({
      ok: true,
      messageId: record.id,
      timestamp: record.created_at
    });
  } catch (error) {
    logger.error("Failed to process webhook", {
      lineId,
      to,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

const status = async (req, res) => {
  res.json({ ok: true });
};

module.exports = { inbound, status };
