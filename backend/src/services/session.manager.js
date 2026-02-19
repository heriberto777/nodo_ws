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
const {
  acquireLineLock,
  releaseLineLock,
  forceReleaseLineLock
} = require("./distributed-lock.service");
const ownership = require("./session-ownership.service");

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.io = null;
    this.qrCounters = new Map();
    this.disconnectCounters = new Map();
    this.reconnectAttempts = new Map();
    this.reconnectTimers = new Map();
    this.safeModeUntil = new Map();
    this.lastQr = new Map();
  }

  getSessionDir(lineId) {
    const path = require("path");
    return path.join(process.cwd(), ".wwebjs_auth", `session-${lineId}`);
  }

  async findSessionLockFiles(lineId) {
    lineId = String(lineId);
    const fs = require("fs/promises");
    const path = require("path");
    const sessionDir = this.getSessionDir(lineId);
    const lockFiles = ["SingletonLock", "SingletonSocket", "SingletonCookie", "lockfile"];
    const locations = [sessionDir, path.join(sessionDir, "Default")];
    const found = [];

    for (const location of locations) {
      for (const file of lockFiles) {
        try {
          await fs.access(path.join(location, file));
          found.push(path.join(location, file));
        } catch {
          // ignore missing file
        }
      }
    }

    return found;
  }

  async killBrowserForSession(lineId) {
    lineId = String(lineId);
    if (!env.autoKillBrowserLocks) return false;
    const { exec } = require("child_process");
    const sessionDir = this.getSessionDir(lineId);

    if (process.platform === "win32") {
      const escapedDir = sessionDir.replace(/\\/g, "\\\\");
      const command =
        "powershell -NoProfile -Command " +
        `"Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*--user-data-dir=${escapedDir}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"`;

      return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            logger.warn("Failed to kill browser process", {
              lineId,
              error: error.message,
              stderr: stderr || null
            });
            resolve(false);
            return;
          }
          resolve(true);
        });
      });
    }

    if (process.platform === "linux") {
      const escapedDir = sessionDir.replace(/"/g, "\\\"");
      const command = `pkill -f -- "--user-data-dir=${escapedDir}"`;

      return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            logger.warn("Failed to kill browser process", {
              lineId,
              error: error.message,
              stderr: stderr || null
            });
            resolve(false);
            return;
          }
          resolve(true);
        });
      });
    }

    return false;
  }

  bumpCounter(counterMap, lineId, windowMs) {
    lineId = String(lineId);
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
    lineId = String(lineId);
    counterMap.delete(lineId);
  }

  scheduleReconnect(lineId, reason, options = {}) {
    lineId = String(lineId);
    if (this.reconnectTimers.has(lineId)) return;

    const attempt = (this.reconnectAttempts.get(lineId) || 0) + 1;
    this.reconnectAttempts.set(lineId, attempt);
    const baseDelay = Math.min(60000, 5000 * attempt);
    const jitter = Math.floor(Math.random() * 2000);
    const delayMs = baseDelay + jitter;

    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(lineId);
      try {
        if (options.reset) {
          await this.resetAndConnect(lineId);
        } else {
          await this.connect(lineId);
        }
        logger.info("Reconnect attempt executed", { lineId, attempt, reason });
      } catch (error) {
        logger.warn("Reconnect attempt failed", { lineId, attempt, reason, error: error.message });
        this.scheduleReconnect(lineId, "RETRY_FAILED", options);
      }
    }, delayMs);

    this.reconnectTimers.set(lineId, timer);
  }

  enableSafeMode(lineId, reason) {
    lineId = String(lineId);
    const until = Date.now() + env.safeModeDurationMs;
    this.safeModeUntil.set(lineId, { until, reason });
    logger.warn("Safe mode enabled", { lineId, reason, until });
  }

  async evaluateRisk(lineId) {
    lineId = String(lineId);
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
    lineId = String(lineId);
    const entry = this.safeModeUntil.get(lineId);
    if (!entry) return false;
    if (Date.now() > entry.until) {
      this.safeModeUntil.delete(lineId);
      return false;
    }
    return true;
  }

  getSafeModeInfo(lineId) {
    lineId = String(lineId);
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
    lineId = String(lineId);
    this.safeModeUntil.delete(lineId);
  }

  bindSocket(io) {
    this.io = io;

    io.on("connection", (socket) => {
      socket.emit("status:list", this.getAllStatuses());
    });
  }

  createSession(lineId) {
    lineId = String(lineId);
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
      lastQrAt: null,
      lastConnectAt: null,
      lastInitAttemptAt: null,
      intentionallyDisconnected: false
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
      this.reconnectAttempts.delete(lineId);
      await ownership.setOwner(lineId, env.nodeId);
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
      this.scheduleReconnect(lineId, "AUTH_FAILURE", { reset: true });
    });

    client.on("disconnected", async (reason) => {
      session.status = reason === "BAN" ? SESSION_STATUSES.BLOCKED : SESSION_STATUSES.DISCONNECTED;
      session.ready = false;
      session.lastError = reason || "disconnected";
      await updateStatus(lineId, session.status);
      this.emitStatus(lineId, session.status);
      if (session.intentionallyDisconnected) {
        await ownership.clearOwner(lineId);
      } else {
        await ownership.touchOwner(lineId);
      }

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

      // Only auto-reconnect if not intentionally disconnected by user
      if (reason !== "BAN" && !session.intentionallyDisconnected) {
        this.scheduleReconnect(lineId, "DISCONNECTED");
      } else if (session.intentionallyDisconnected) {
        logger.info("Skipping auto-reconnect: intentional disconnection", { lineId });
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

      let displayName = null;
      try {
        const contact = await message.getContact();
        displayName =
          contact?.pushname ||
          contact?.name ||
          contact?.shortName ||
          contact?.verifiedName ||
          contact?.formattedName ||
          null;
      } catch (error) {
        logger.warn("Failed to resolve contact name", { lineId, error: error.message });
      }

      // Extract wa_id (phone number without special characters)
      const extractWaId = (phone) => {
        return phone?.replace(/\D/g, '') || phone;
      };

      const waIdFrom = extractWaId(message.from);
      const waIdTo = extractWaId(message.to);

      // WhatsApp-compatible payload structure
      const payload = {
        // Standard WhatsApp fields
        wa_id: waIdFrom,
        from: message.from,
        from_name: displayName,
        to: message.to,
        to_id: waIdTo,
        
        // Message content
        type: message.hasMedia ? "image" : "text",
        text: message.body,
        body: message.body,
        
        // Metadata
        timestamp: Math.floor(message.timestamp),
        message_id: message.id._serialized,
        
        // Context
        lineId,
        author: message.author || message.from,
        senderName: displayName,
        isGroup: message.isGroupMsg,
        isFromMe: message.fromMe,
        
        // For compatibility with old format
        _legacyPayload: {
          from: message.from,
          to: message.to,
          author: message.author || message.from,
          senderName: displayName,
          body: message.body,
          timestamp: message.timestamp,
          isGroup: message.isGroupMsg
        }
      };

      if (settings?.webhook_base64 && message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          payload.media = media;
          payload.media_type = media.mimetype;
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
          body: message.body,
          displayName
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
    lineId = String(lineId);
    const session = this.createSession(lineId);
    if (!session.client) return session;

    if (this.reconnectTimers.has(lineId)) {
      clearTimeout(this.reconnectTimers.get(lineId));
      this.reconnectTimers.delete(lineId);
    }

    // Reset intentional disconnect flag when user wants to reconnect
    session.intentionallyDisconnected = false;

    if (session.ready || session.initializing) {
      return session;
    }

    const cooldownMs = 15000;
    if (session.lastInitAttemptAt) {
      const delta = Date.now() - new Date(session.lastInitAttemptAt).getTime();
      if (delta < cooldownMs) {
        return session;
      }
    }

    const distributedLockHandle = await acquireLineLock(lineId);
    if (!distributedLockHandle) {
      session.lastError = "session_lock_in_use";
      logger.warn("Distributed session lock active", { lineId });
      return session;
    }

    try {
      const lock = await this.checkSessionLock(lineId);
      if (lock?.locked) {
        session.lastError = `session_locked:${lock.files.join(",")}`;
        logger.warn("Session lock detected", { lineId, files: lock.files });
        try {
          await this.killBrowserForSession(lineId);
          const cleaned = await this.cleanupSession(lineId, {
            lockHandle: distributedLockHandle,
            preserveOwner: true
          });
          if (cleaned) {
            logger.info("Session lock cleaned, scheduling reconnect", { lineId });
            this.scheduleReconnect(lineId, "SESSION_LOCK_CLEANED", { reset: true });
          }
        } catch (cleanupError) {
          logger.error("Failed to cleanup after session lock", {
            lineId,
            error: cleanupError.message
          });
        }
        return session;
      }

      session.initializing = true;
      session.lastConnectAt = new Date().toISOString();
      session.lastInitAttemptAt = session.lastConnectAt;
      session.lastError = null;
      await session.client.initialize();
      await this.refreshSettings(lineId);
      session.initializing = false;
      return session;
    } catch (error) {
      session.initializing = false;
      session.lastError = error?.message || "initialize_failed";
      session.lastInitAttemptAt = new Date().toISOString();
      logger.error("Failed to initialize session", { lineId, error: error.message });

      const message = String(error?.message || "");
      if (message.includes("Target closed")) {
        try {
          await this.cleanupSession(lineId, {
            lockHandle: distributedLockHandle,
            preserveOwner: true
          });
        } catch (cleanupError) {
          logger.warn("Cleanup after target closed failed", {
            lineId,
            error: cleanupError.message
          });
        }
        this.scheduleReconnect(lineId, "TARGET_CLOSED", { reset: true });
        return this.sessions.get(lineId) || session;
      }

      if (message.includes("already running") || message.includes("userDataDir")) {
        const lockInfo = await this.checkSessionLock(lineId);
        if (lockInfo?.locked) {
          session.lastError = `session_locked:${lockInfo.files.join(",")}`;
          logger.warn("Browser conflict with lock files", { lineId, files: lockInfo.files });
          return session;
        }
        await this.killBrowserForSession(lineId);
        try {
          await this.cleanupSession(lineId, {
            lockHandle: distributedLockHandle,
            preserveOwner: true
          });
        } catch (cleanupError) {
          logger.warn("Cleanup after browser conflict failed", {
            lineId,
            error: cleanupError.message
          });
        }
        this.scheduleReconnect(lineId, "BROWSER_CONFLICT", { reset: true });
        return this.sessions.get(lineId) || session;
      }

      // Return the session with the error logged instead of throwing
      logger.warn("Connect failed with unknown error", { lineId, error: error.message });
      return session;
    } finally {
      await releaseLineLock(distributedLockHandle);
    }
  }

  async disconnect(lineId) {
    lineId = String(lineId);
    const session = this.sessions.get(lineId);
    if (!session) return null;

    // Mark as intentionally disconnected to prevent auto-reconnect
    session.intentionallyDisconnected = true;

    try {
      if (session.client && typeof session.client.destroy === 'function') {
        await session.client.destroy();
      }
    } catch (error) {
      logger.warn("Error destroying client during disconnect", {
        lineId,
        error: error.message
      });
    }

    session.ready = false;
    session.status = SESSION_STATUSES.DISCONNECTED;
    await updateStatus(lineId, session.status);
    this.emitStatus(lineId, session.status);
    await ownership.clearOwner(lineId);
    return session;
  }

  async removeSession(lineId) {
    lineId = String(lineId);
    const session = this.sessions.get(lineId);
    if (!session) return null;
    try {
      await session.client.destroy();
    } catch (error) {
      logger.error("Failed to destroy session", { lineId, error: error.message });
    }
    this.sessions.delete(lineId);
    await ownership.clearOwner(lineId);
    return true;
  }

  async resetSession(lineId) {
    lineId = String(lineId);
    const session = this.sessions.get(lineId);
    if (!session) return null;
    try {
      if (session.client?.pupPage) {
        await session.client.logout();
      }
    } catch (error) {
      if (!String(error?.message || "").includes("reading 'evaluate'")) {
        logger.error("Failed to logout session", { lineId, error: error.message });
      }
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
    session.lastConnectAt = null;
    session.lastInitAttemptAt = null;
    this.lastQr.delete(lineId);
    await updateStatus(lineId, session.status);
    this.emitStatus(lineId, session.status);
    return true;
  }

  async resetAndConnect(lineId) {
    lineId = String(lineId);
    await this.resetSession(lineId);
    return this.connect(lineId);
  }

  async cleanupSession(lineId, options = {}) {
    lineId = String(lineId);
    const path = require("path");
    const fs = require("fs/promises");
    let acquiredHandle = null;
    const preserveOwner = Boolean(options.preserveOwner);
    if (!options.lockHandle) {
      acquiredHandle = await acquireLineLock(lineId);
      if (!acquiredHandle) {
        logger.warn("Distributed session lock active, cleanup skipped", { lineId });
        return false;
      }
    }

    try {
      try {
        await this.resetSession(lineId);
      } catch (error) {
        logger.warn("Failed to reset session during cleanup", { lineId, error: error.message });
      }

      const sessionDir = this.getSessionDir(lineId);
      const lockFiles = ["SingletonLock", "SingletonSocket", "SingletonCookie", "lockfile"];
      const lockLocations = [sessionDir, path.join(sessionDir, "Default")];
      const tryRemove = async (attempt) => {
        try {
          await fs.rm(sessionDir, { recursive: true, force: true });
          this.sessions.delete(lineId);
          return true;
        } catch (error) {
          const message = String(error?.message || "");
          if (message.includes("EBUSY") && attempt < 3) {
            for (const location of lockLocations) {
              for (const file of lockFiles) {
                try {
                  await fs.rm(path.join(location, file), { force: true });
                } catch {
                  // ignore
                }
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
            return tryRemove(attempt + 1);
          }
          logger.error("Failed to cleanup session directory", { lineId, error: error.message });
          return false;
        }
      };

      const cleaned = await tryRemove(0);
      if (cleaned && !preserveOwner) {
        await ownership.clearOwner(lineId);
      }
      return cleaned;
    } finally {
      if (acquiredHandle) {
        await releaseLineLock(acquiredHandle);
      }
    }
  }

  async releaseSessionLock(lineId) {
    lineId = String(lineId);
    let distributedHandle = await acquireLineLock(lineId);
    if (!distributedHandle) {
      logger.warn("Distributed session lock active, forcing unlock", { lineId });
      await forceReleaseLineLock(lineId);
      distributedHandle = await acquireLineLock(lineId);
      if (!distributedHandle) {
        logger.error("Unable to acquire lock after force release", { lineId });
        return false;
      }
    }

    const session = this.sessions.get(lineId);
    try {
      try {
        if (session?.client?.pupBrowser) {
          await session.client.pupBrowser.close();
        }
      } catch (error) {
        logger.warn("Failed to close puppeteer browser", { lineId, error: error.message });
      }
      try {
        if (session?.client) {
          await session.client.destroy();
        }
      } catch (error) {
        logger.warn("Failed to destroy client during lock release", {
          lineId,
          error: error.message
        });
      }

      await this.killBrowserForSession(lineId);

      const cleaned = await this.cleanupSession(lineId, { lockHandle: distributedHandle });
      if (!cleaned) {
        const path = require("path");
        const fs = require("fs/promises");
        const sessionDir = this.getSessionDir(lineId);
        const lockFiles = ["SingletonLock", "SingletonSocket", "SingletonCookie", "lockfile"];
        const lockLocations = [sessionDir, path.join(sessionDir, "Default")];
        for (const location of lockLocations) {
          for (const file of lockFiles) {
            try {
              await fs.rm(path.join(location, file), { force: true });
            } catch {
              // ignore
            }
          }
        }
      }
      await ownership.clearOwner(lineId);
      return true;
    } finally {
      await releaseLineLock(distributedHandle);
    }
  }

  async refreshSettings(lineId) {
    lineId = String(lineId);
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
    return this.sessions.get(String(lineId));
  }

  getSessionInfo(lineId) {
    const session = this.sessions.get(String(lineId));
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

  async checkSessionLock(lineId) {
    lineId = String(lineId);
    const found = await this.findSessionLockFiles(lineId);
    return { locked: found.length > 0, files: found };
  }

  listActiveSessions() {
    return Array.from(this.sessions.values()).map((session) => ({
      lineId: session.lineId,
      status: session.status,
      ready: session.ready,
      initializing: session.initializing,
      lastError: session.lastError,
      lastQrAt: session.lastQrAt,
      lastConnectAt: session.lastConnectAt
    }));
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
    return this.lastQr.get(String(lineId)) || null;
  }

  emitMessage(payload) {
    if (this.io) this.io.emit("message", payload);
  }

  emitRisk(payload) {
    if (this.io) this.io.emit("risk:event", payload);
  }
}

module.exports = new SessionManager();
