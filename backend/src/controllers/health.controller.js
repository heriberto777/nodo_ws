const env = require("../config/env");
const { getQueueMetrics } = require("../services/message-queue.service");

const health = async (_req, res) => {
  const queue = await getQueueMetrics();
  res.json({ status: "ok", nodeId: env.nodeId, queue });
};

module.exports = { health };
