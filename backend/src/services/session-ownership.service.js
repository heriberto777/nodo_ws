const redis = require("../config/redis");
const env = require("../config/env");
const logger = require("../config/logger");

const buildKey = (lineId) => `session:owner:${String(lineId)}`;

const setOwner = async (lineId, nodeId) => {
  const payload = JSON.stringify({
    nodeId,
    assignedAt: new Date().toISOString()
  });
  try {
    await redis.set(buildKey(lineId), payload, "PX", env.sessionOwnerTtlMs);
    return true;
  } catch (error) {
    logger.warn("Failed to set session owner", { lineId, nodeId, error: error.message });
    return false;
  }
};

const touchOwner = async (lineId) => {
  try {
    await redis.pexpire(buildKey(lineId), env.sessionOwnerTtlMs);
    return true;
  } catch (error) {
    logger.warn("Failed to refresh session owner TTL", { lineId, error: error.message });
    return false;
  }
};

const getOwner = async (lineId) => {
  try {
    const value = await redis.get(buildKey(lineId));
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return { raw: value };
    }
  } catch (error) {
    logger.warn("Failed to read session owner", { lineId, error: error.message });
    return null;
  }
};

const clearOwner = async (lineId) => {
  try {
    await redis.del(buildKey(lineId));
    return true;
  } catch (error) {
    logger.warn("Failed to clear session owner", { lineId, error: error.message });
    return false;
  }
};

module.exports = {
  setOwner,
  touchOwner,
  getOwner,
  clearOwner
};
