const { Client, LocalAuth } = require("whatsapp-web.js");
const EventEmitter = require("events");
const logger = require("../config/logger");
const { SESSION_STATUSES } = require("../utils/constants");
const { updateStatus, getLineSettings } = require("../models/line.model");
const { forwardInboundMessage } = require("./n8n.service");

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.io = null;
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
      settings: null
    };

    this.sessions.set(lineId, session);

    client.on("qr", async (qr) => {
      session.status = SESSION_STATUSES.QR;
      await updateStatus(lineId, session.status);
      this.emitStatus(lineId, session.status);
      this.emitQr(lineId, qr);
    });

    client.on("ready", async () => {
      session.status = SESSION_STATUSES.CONNECTED;
      session.ready = true;
      await updateStatus(lineId, session.status);
      this.emitStatus(lineId, session.status);
      await this.refreshSettings(lineId);
    });

    client.on("authenticated", async () => {
      session.status = SESSION_STATUSES.CONNECTED;
      await updateStatus(lineId, session.status);
      this.emitStatus(lineId, session.status);
    });

    client.on("disconnected", async (reason) => {
      session.status = reason === "BAN" ? SESSION_STATUSES.BLOCKED : SESSION_STATUSES.DISCONNECTED;
      session.ready = false;
      await updateStatus(lineId, session.status);
      this.emitStatus(lineId, session.status);
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
      await session.client.initialize();
      await this.refreshSettings(lineId);
      session.initializing = false;
      return session;
    } catch (error) {
      session.initializing = false;
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

  emitMessage(payload) {
    if (this.io) this.io.emit("message", payload);
  }
}

module.exports = new SessionManager();
