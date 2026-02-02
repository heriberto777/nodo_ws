const { Client, LocalAuth } = require("whatsapp-web.js");
const EventEmitter = require("events");
const logger = require("../config/logger");
const env = require("../config/env");
const { SESSION_STATUSES } = require("../utils/constants");
const { updateStatus, getLineSettings } = require("../models/line.model");
const { createMessage } = require("../models/message.model");
const { createRiskEvent, getRiskStats } = require("../models/risk.model");
const { createNotification } = require("../models/notification.model");
const { sendAlertWebhook } = require("./alert.service");
const { forwardInboundMessage } = require("./n8n.service");
const { handleInboundMessage } = require("./chatbot.service");
const { checkRateLimit } = require("./ratelimit.service");
const { isAllowed } = require("./warmup.service");

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.io = null;
    this.qrCounters = new Map();
    this.disconnectCounters = new Map();
    this.safeModeUntil = new Map();
    this.lastQr = new Map();
  }

  bumpCounter(counterMap, lineId, windowMs) {
    const now = Date.now();
    const entry = counterMap.get(lineId);
    if (!entry || now - entry.firstAt > windowMs) {
      counterMap.set(lineId, { count: 1, firstAt: now });
      return 1;
    }
    entry.count += 1;
    counterMap.set(lineId, entry);
    return entry.count;
  }

  resetCounter(counterMap, lineId) {
    counterMap.delete(lineId);
  }

  enableSafeMode(lineId, reason) {
    const until = Date.now() + env.safeModeDurationMs;
    this.safeModeUntil.set(lineId, { until, reason });
    logger.warn("Safe mode enabled", { lineId, reason, until });
  }

  async evaluateRisk(lineId) {
    try {
      const stats = await getRiskStats({ lineId, windowMinutes: 60 });
      if (stats.high >= 1 || stats.medium >= 3 || stats.total >= 5) {
        this.enableSafeMode(lineId, "RISK_THRESHOLD");
      }
    } catch (error) {
      logger.error("Failed to evaluate risk", { lineId, error: error.message });
    }
  }

  isSafeMode(lineId) {
    const entry = this.safeModeUntil.get(lineId);
    if (!entry) return false;
    if (Date.now() > entry.until) {
      this.safeModeUntil.delete(lineId);
      return false;
    }
    return true;
  }

  getSafeModeInfo(lineId) {
    const entry = this.safeModeUntil.get(lineId);
    if (!entry) return { active: false };
    if (Date.now() > entry.until) {
      this.safeModeUntil.delete(lineId);
      return { active: false };
    }
    return {
      active: true,
      until: new Date(entry.until).toISOString(),
      reason: entry.reason
    };
  }

  clearSafeMode(lineId) {
    this.safeModeUntil.delete(lineId);
  }

  bindSocket(io) {
    this.io = io;

    io.on("connection", (socket) => {
      socket.emit("status:list", this.getAllStatuses());
    });
  }

  createSession(lineId) {
    if (this.sessions.has(lineId)) return this.sessions.get(lineId);

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: lineId }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      }
    });

    const session = {
      lineId,
      client,
      status: SESSION_STATUSES.CREATED,
      ready: false,
      initializing: false,
      settings: null,
      lastError: null,
      lastQrAt: null
    };

    this.sessions.set(lineId, session);

    client.on("qr", async (qr) => {
      session.status = SESSION_STATUSES.QR;
      session.lastQrAt = new Date().toISOString();
      session.lastError = null;
      this.lastQr.set(lineId, qr);
      await updateStatus(lineId, session.status);
      this.emitStatus(lineId, session.status);
      this.emitQr(lineId, qr);

      const qrCount = this.bumpCounter(this.qrCounters, lineId, 10 * 60 * 1000);
      if (qrCount >= 3) {
        const event = await createRiskEvent({
          lineId,
          type: "QR_REPEAT",
          severity: "MEDIUM",
          details: { count: qrCount }
        });
        await createNotification({
          lineId,
          type: event.type,
          severity: event.severity,
          message: "QR repetido"
        });
        await sendAlertWebhook(event);
        this.emitRisk(event);
        this.enableSafeMode(lineId, "QR_REPEAT");
        await this.evaluateRisk(lineId);
      }
    });

    client.on("ready", async () => {
      session.status = SESSION_STATUSES.CONNECTED;
      session.ready = true;
      session.lastError = null;
      this.lastQr.delete(lineId);
      await updateStatus(lineId, session.status);
      this.emitStatus(lineId, session.status);
      await this.refreshSettings(lineId);
      this.resetCounter(this.qrCounters, lineId);
      this.resetCounter(this.disconnectCounters, lineId);
    });

    client.on("authenticated", async () => {
      session.status = SESSION_STATUSES.CONNECTED;
      session.lastError = null;
      this.lastQr.delete(lineId);
      await updateStatus(lineId, session.status);
      this.emitStatus(lineId, session.status);
      this.resetCounter(this.qrCounters, lineId);
    });

    client.on("auth_failure", async (message) => {
      session.status = SESSION_STATUSES.DISCONNECTED;
      session.ready = false;
      session.lastError = message || "auth_failure";
      await updateStatus(lineId, session.status);
      this.emitStatus(lineId, session.status);
    });

    client.on("disconnected", async (reason) => {
      session.status = reason === "BAN" ? SESSION_STATUSES.BLOCKED : SESSION_STATUSES.DISCONNECTED;
      session.ready = false;
      session.lastError = reason || "disconnected";
      await updateStatus(lineId, session.status);
      this.emitStatus(lineId, session.status);

      const disconnects = this.bumpCounter(this.disconnectCounters, lineId, 15 * 60 * 1000);
      if (reason === "BAN") {
        const event = await createRiskEvent({
          lineId,
          type: "BANNED",
          severity: "HIGH",
          details: { reason }
        });
        await createNotification({
          lineId,
          type: event.type,
          severity: event.severity,
          message: "Número bloqueado"
        });
        await sendAlertWebhook(event);
        this.emitRisk(event);
        this.enableSafeMode(lineId, "BANNED");
        await this.evaluateRisk(lineId);
      } else if (disconnects >= 3) {
        const event = await createRiskEvent({
          lineId,
          type: "FREQUENT_DISCONNECT",
          severity: "MEDIUM",
          details: { count: disconnects, reason }
        });
        await createNotification({
          lineId,
          type: event.type,
          severity: event.severity,
          message: "Desconexiones frecuentes"
        });
        await sendAlertWebhook(event);
        this.emitRisk(event);
        this.enableSafeMode(lineId, "FREQUENT_DISCONNECT");
        await this.evaluateRisk(lineId);
      }
    });

    client.on("message", async (message) => {
      const settings = session.settings || (await this.refreshSettings(lineId));
      if (settings?.ignore_groups && message.isGroupMsg) {
        return;
      }

      if (settings?.read_messages) {
        try {
          const chat = await message.getChat();
          await chat.sendSeen();
        } catch (error) {
          logger.error("Failed to mark chat as seen", { lineId, error: error.message });
        }
      }

      const payload = {
        lineId,
        from: message.from,
        to: message.to,
        author: message.author || message.from,
        body: message.body,
        timestamp: message.timestamp,
        isGroup: message.isGroupMsg
      };

      if (settings?.webhook_base64 && message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          payload.media = media;
        } catch (error) {
          logger.error("Failed to download media", { lineId, error: error.message });
        }
      }
      await forwardInboundMessage(payload);
      let conversation = null;
      let replyText = null;
      try {
        const result = await handleInboundMessage({
          lineId,
          from: message.from,
          body: message.body
        });
        conversation = result?.conversation || null;
        replyText = result?.reply || null;
      } catch (error) {
        logger.error("Failed to update conversation state", { lineId, error: error.message });
      }
      try {
        await createMessage({
          lineId,
          conversationId: conversation?.id,
          direction: "IN",
          to: message.to,
          from: message.from,
          body: message.body
        });
      } catch (error) {
        logger.error("Failed to store inbound message", { lineId, error: error.message });
      }

      if (replyText && !this.isSafeMode(lineId)) {
        try {
          if (!(await isAllowed(lineId))) {
            logger.warn("Warm-up limit exceeded for auto-reply", { lineId });
          } else {
            await checkRateLimit(lineId);
            const min = env.antiBanMinDelayMs;
            const max = env.antiBanMaxDelayMs;
            const delay = Math.floor(Math.random() * (max - min + 1)) + min;
            if (delay > 0) {
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
            if (session.client) {
              await session.client.sendMessage(message.from, replyText);
            }

            await createMessage({
              lineId,
              conversationId: conversation?.id,
              direction: "OUT",
              to: message.from,
              from: lineId,
              body: replyText
            });
          }
        } catch (error) {
          logger.error("Failed to send bot reply", { lineId, error: error.message });
        }
      }
      this.emitMessage(payload);
    });

    return session;
  }

  async connect(lineId) {
    const session = this.createSession(lineId);
    if (!session.client) return session;

    if (session.ready || session.initializing) {
      return session;
    }

    try {
      session.initializing = true;
      session.lastError = null;
      await session.client.initialize();
      await this.refreshSettings(lineId);
      session.initializing = false;
      return session;
    } catch (error) {
      session.initializing = false;
      session.lastError = error?.message || "initialize_failed";
      logger.error("Failed to initialize session", { lineId, error: error.message });
      throw error;
    }
  }

  async disconnect(lineId) {
    const session = this.sessions.get(lineId);
    if (!session) return null;

    await session.client.destroy();
    session.ready = false;
    session.status = SESSION_STATUSES.DISCONNECTED;
    await updateStatus(lineId, session.status);
    this.emitStatus(lineId, session.status);
    return session;
  }

  async removeSession(lineId) {
    const session = this.sessions.get(lineId);
    if (!session) return null;
    try {
      await session.client.destroy();
    } catch (error) {
      logger.error("Failed to destroy session", { lineId, error: error.message });
    }
    this.sessions.delete(lineId);
    return true;
  }

  async resetSession(lineId) {
    const session = this.sessions.get(lineId);
    if (!session) return null;
    try {
      await session.client.logout();
    } catch (error) {
      logger.error("Failed to logout session", { lineId, error: error.message });
    }
    try {
      await session.client.destroy();
    } catch (error) {
      logger.error("Failed to destroy session", { lineId, error: error.message });
    }
    session.ready = false;
    session.status = SESSION_STATUSES.DISCONNECTED;
    session.lastError = null;
    session.lastQrAt = null;
    this.lastQr.delete(lineId);
    await updateStatus(lineId, session.status);
    this.emitStatus(lineId, session.status);
    return true;
  }

  async refreshSettings(lineId) {
    try {
      const settings = await getLineSettings(lineId);
      const session = this.sessions.get(lineId);
      if (session) {
        session.settings = settings || null;
      }
      return settings;
    } catch (error) {
      logger.error("Failed to refresh line settings", { lineId, error: error.message });
      return null;
    }
  }

  getSession(lineId) {
    return this.sessions.get(lineId);
  }

  getSessionInfo(lineId) {
    const session = this.sessions.get(lineId);
    if (!session) return null;
    return {
      lineId: session.lineId,
      status: session.status,
      ready: session.ready,
      initializing: session.initializing,
      lastError: session.lastError,
      lastQrAt: session.lastQrAt
    };
  }

  getAllStatuses() {
    return Array.from(this.sessions.values()).map((session) => ({
      lineId: session.lineId,
      status: session.status
    }));
  }

  emitStatus(lineId, status) {
    if (this.io) this.io.emit("status:update", { lineId, status });
  }

  emitQr(lineId, qr) {
    if (this.io) this.io.emit("qr", { lineId, qr });
  }

  getLastQr(lineId) {
    return this.lastQr.get(lineId) || null;
  }

  emitMessage(payload) {
    if (this.io) this.io.emit("message", payload);
  }

  emitRisk(payload) {
    if (this.io) this.io.emit("risk:event", payload);
  }
}

module.exports = new SessionManager();
