const Redis = require("ioredis");
const env = require("./env");

const redis = env.redisUrl ? new Redis(env.redisUrl) : new Redis();

module.exports = redis;
