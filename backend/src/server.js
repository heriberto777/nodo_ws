const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const env = require("./config/env");
const logger = require("./config/logger");
const sessionManager = require("./services/session.manager");
const { startReportScheduler } = require("./services/report.scheduler");
const { listLines } = require("./models/line.model");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.corsOrigin }
});

sessionManager.bindSocket(io);
startReportScheduler();

const connectAllLines = async (reason) => {
  try {
    const lines = await listLines();
    for (const line of lines) {
      if (line.status === "BLOCKED") continue;
      try {
        await sessionManager.connect(String(line.id));
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        logger.warn("Auto-connect failed", {
          lineId: line.id,
          reason,
          error: error.message
        });
      }
    }
  } catch (error) {
    logger.error("Auto-connect batch failed", { reason, error: error.message });
  }
};

process.on("unhandledRejection", (reason) => {
  logger.error("UnhandledRejection", { reason });
});

process.on("uncaughtException", (error) => {
  logger.error("UncaughtException", { error: error.message, stack: error.stack });
});

server.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port}`);
  setTimeout(() => connectAllLines("startup"), 2000);
  setInterval(() => connectAllLines("heartbeat"), 5 * 60 * 1000);
});
