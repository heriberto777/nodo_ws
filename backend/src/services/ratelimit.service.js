const { RateLimiterRedis } = require("rate-limiter-flexible");
const redis = require("../config/redis");
const { DEFAULT_RATE_LIMITS } = require("../utils/constants");
const { getSettings } = require("../models/settings.model");
const { getLineRateLimits } = require("../models/line.model");

const limiterCache = new Map();

const buildLimiters = (key, limits) => {
  const limiters = {
    minute: new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `wa_rl_min_${key}`,
      points: limits.perMinute,
      duration: 60
    }),
    hour: new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `wa_rl_hour_${key}`,
      points: limits.perHour,
      duration: 60 * 60
    }),
    day: new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `wa_rl_day_${key}`,
      points: limits.perDay,
      duration: 60 * 60 * 24
    })
  };
  limiterCache.set(key, limiters);
  return limiters;
};

const resolveLimits = async (lineId) => {
  const settings = await getSettings();
  const lineLimits = await getLineRateLimits(lineId);

  return {
    perMinute: lineLimits?.rate_limit_minute || settings?.rate_limit_minute || DEFAULT_RATE_LIMITS.perMinute,
    perHour: lineLimits?.rate_limit_hour || settings?.rate_limit_hour || DEFAULT_RATE_LIMITS.perHour,
    perDay: lineLimits?.rate_limit_day || settings?.rate_limit_day || DEFAULT_RATE_LIMITS.perDay
  };
};

const checkRateLimit = async (lineId) => {
  const limits = await resolveLimits(lineId);
  const key = `${lineId}_${limits.perMinute}_${limits.perHour}_${limits.perDay}`;
  const limiters = limiterCache.get(key) || buildLimiters(key, limits);

  await limiters.minute.consume(lineId);
  await limiters.hour.consume(lineId);
  await limiters.day.consume(lineId);
};

module.exports = { checkRateLimit };
