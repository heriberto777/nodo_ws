const { Queue, Worker } = require("bullmq");
const redis = require("../config/redis");
const env = require("../config/env");
const logger = require("../config/logger");
const { getOrCreateConversation, touchConversation } = require("../models/conversation.model");
const { createMessage } = require("../models/message.model");
const { sendMessageWithDelay } = require("./whatsapp.service");
const { isAllowed } = require("./warmup.service");
const { checkRateLimit } = require("./ratelimit.service");

const connection = redis.duplicate({
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});
const queueName = env.messageQueueName;

const queue = new Queue(queueName, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 500,
    removeOnFail: 2000,
    attempts: env.messageQueueAttempts,
    backoff: {
      type: "exponential",
      delay: env.antiBanMinDelayMs
    }
  }
});

const worker = new Worker(
  queueName,
  async (job) => {
    const { lineId, to, message, type, location } = job.data;

    if (!(await isAllowed(lineId))) {
      const error = new Error("warmup_blocked");
      error.retryable = false;
      throw error;
    }

    try {
      await checkRateLimit(lineId);
    } catch (error) {
      const rateError = new Error("rate_limit_exceeded");
      rateError.retryable = false;
      throw rateError;
    }

    const conversation = await getOrCreateConversation({ lineId, contact: to });
    await touchConversation(conversation.id);

    await sendMessageWithDelay({ lineId, to, message, type, location });

    await createMessage({
      lineId,
      conversationId: conversation.id,
      direction: "OUT",
      to,
      from: lineId,
      body: message
    });
    return { sent: true };
  },
  {
    connection,
    concurrency: env.messageQueueConcurrency
  }
);

worker.on("completed", (job) => {
  logger.info("Outbound message sent", {
    jobId: job.id,
    lineId: job.data.lineId,
    to: job.data.to
  });
});

worker.on("failed", (job, error) => {
  logger.warn("Outbound message failed", {
    jobId: job?.id,
    lineId: job?.data?.lineId,
    to: job?.data?.to,
    error: error?.message
  });
});

const enqueueOutboundMessage = async (payload) => {
  const job = await queue.add("outbound", payload, {
    jobId: `${payload.lineId}:${Date.now()}:${Math.random().toString(16).slice(2)}`
  });
  return job.id;
};
const getQueueMetrics = async () => {
  try {
    const [counts, isRunning] = await Promise.all([
      queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
      worker.isRunning()
    ]);
    return {
      name: queueName,
      nodeId: env.nodeId,
      counts,
      worker: {
        isRunning,
        concurrency: env.messageQueueConcurrency
      }
    };
  } catch (error) {
    logger.warn("Failed to collect queue metrics", { error: error.message });
    return {
      name: queueName,
      nodeId: env.nodeId,
      error: error.message
    };
  }
};

const logWorkerHealth = async () => {
  const metrics = await getQueueMetrics();
  if (metrics.error) {
    logger.warn("Queue health degraded", metrics);
  } else if (!metrics.worker.isRunning) {
    logger.warn("Queue worker not running", metrics);
  } else {
    logger.info("Queue health", metrics);
  }
};

logWorkerHealth();
const healthInterval = setInterval(logWorkerHealth, 60 * 1000);
healthInterval.unref();

module.exports = {
  enqueueOutboundMessage,
  getQueueMetrics
};
