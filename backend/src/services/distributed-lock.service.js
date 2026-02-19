const { randomUUID } = require("crypto");
const redis = require("../config/redis");
const env = require("../config/env");
const logger = require("../config/logger");

const RELEASE_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const buildKey = (lineId) => `session:lock:${String(lineId)}`;

const acquireLineLock = async (lineId, options = {}) => {
  const ttlMs = options.ttlMs || env.sessionLockTtlMs;
  const maxWaitMs = options.maxWaitMs ?? env.sessionLockAcquireTimeoutMs;
  const retryDelayMs = options.retryDelayMs || env.sessionLockRetryDelayMs;
  const key = buildKey(lineId);
  const token = randomUUID();
  const start = Date.now();

  while (true) {
    try {
      const result = await redis.set(key, token, "PX", ttlMs, "NX");
      if (result === "OK") {
        return { key, token };
      }
    } catch (error) {
      logger.error("Distributed lock acquire failed", { lineId, error: error.message });
      return null;
    }

    if (Date.now() - start >= maxWaitMs) {
      return null;
    }
    await sleep(retryDelayMs);
  }
};

const releaseLineLock = async (handle) => {
  if (!handle || !handle.key || !handle.token) {
    return false;
  }
  try {
    const result = await redis.eval(RELEASE_LUA, 1, handle.key, handle.token);
    return result === 1;
  } catch (error) {
    logger.warn("Distributed lock release failed", {
      key: handle.key,
      error: error.message
    });
    return false;
  }
};

module.exports = {
  acquireLineLock,
  releaseLineLock
};
