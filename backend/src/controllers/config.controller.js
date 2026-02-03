const path = require("path");
const fs = require("fs/promises");
const env = require("../config/env");

const getConfigPath = () => {
  return env.frontendConfigPath || "";
};

const isValidUrl = (value) => {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const ensureAuthorized = (req, res) => {
  if (!env.configWriteToken) return true;
  const token = req.headers["x-config-token"] || req.body?.token;
  if (token && token === env.configWriteToken) return true;
  res.status(401).json({ message: "Unauthorized" });
  return false;
};

const readRuntimeConfig = async (req, res, next) => {
  try {
    const filePath = getConfigPath();
    if (!filePath) {
      return res.status(404).json({ message: "FRONTEND_CONFIG_PATH not set" });
    }
    const resolved = path.resolve(filePath);
    let raw = "{}";
    try {
      raw = await fs.readFile(resolved, "utf-8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    return res.json({ config: parsed });
  } catch (error) {
    return next(error);
  }
};

const writeRuntimeConfig = async (req, res, next) => {
  try {
    if (!ensureAuthorized(req, res)) return;

    const { apiUrl, wsUrl } = req.body || {};
    if (!isValidUrl(apiUrl) || !isValidUrl(wsUrl)) {
      return res.status(400).json({ message: "Invalid apiUrl or wsUrl" });
    }

    const filePath = getConfigPath();
    if (!filePath) {
      return res.status(404).json({ message: "FRONTEND_CONFIG_PATH not set" });
    }

    const resolved = path.resolve(filePath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    const payload = { apiUrl, wsUrl };
    await fs.writeFile(resolved, JSON.stringify(payload, null, 2), "utf-8");
    return res.json({ ok: true, config: payload });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  readRuntimeConfig,
  writeRuntimeConfig
};
