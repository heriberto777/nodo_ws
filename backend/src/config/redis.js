const Redis = require("ioredis");
const env = require("./env");

const baseOptions = {
	maxRetriesPerRequest: null,
	enableReadyCheck: false
};

const redis = env.redisUrl ? new Redis(env.redisUrl, baseOptions) : new Redis(baseOptions);

module.exports = redis;
