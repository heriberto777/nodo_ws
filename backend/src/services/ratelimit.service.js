const { RateLimiterRedis } = require("rate-limiter-flexible");
const redis = require("../config/redis");
const { DEFAULT_RATE_LIMITS } = require("../utils/constants");

const limiters = {
  minute: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "wa_rl_min",
    points: DEFAULT_RATE_LIMITS.perMinute,
    duration: 60
  }),
  hour: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "wa_rl_hour",
    points: DEFAULT_RATE_LIMITS.perHour,
    duration: 60 * 60
  }),
  day: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "wa_rl_day",
    points: DEFAULT_RATE_LIMITS.perDay,
    duration: 60 * 60 * 24
  })
};

const checkRateLimit = async (lineId) => {
  await limiters.minute.consume(lineId);
  await limiters.hour.consume(lineId);
  await limiters.day.consume(lineId);
};

module.exports = { checkRateLimit };
