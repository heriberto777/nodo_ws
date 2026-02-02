const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const env = require("./config/env");
const logger = require("./config/logger");
const sessionManager = require("./services/session.manager");
const { startReportScheduler } = require("./services/report.scheduler");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.corsOrigin }
});

sessionManager.bindSocket(io);
startReportScheduler();

process.on("unhandledRejection", (reason) => {
  logger.error("UnhandledRejection", { reason });
});

process.on("uncaughtException", (error) => {
  logger.error("UncaughtException", { error: error.message, stack: error.stack });
});

server.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port}`);
});
