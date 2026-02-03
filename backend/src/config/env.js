const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  apiKey: process.env.API_KEY || "",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || "",
  antiBanMinDelayMs: Number(process.env.ANTIBAN_MIN_DELAY_MS || 5000),
  antiBanMaxDelayMs: Number(process.env.ANTIBAN_MAX_DELAY_MS || 20000),
  safeModeDurationMs: Number(process.env.SAFE_MODE_DURATION_MS || 30 * 60 * 1000),
  frontendConfigPath: process.env.FRONTEND_CONFIG_PATH || "",
  configWriteToken: process.env.CONFIG_WRITE_TOKEN || "",
  autoKillBrowserLocks:
    process.env.AUTO_KILL_BROWSER_LOCKS === "true" ||
    (process.env.AUTO_KILL_BROWSER_LOCKS !== "false" &&
      (process.env.NODE_ENV || "development") !== "production")
};
