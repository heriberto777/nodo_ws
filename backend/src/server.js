const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const env = require("./config/env");
const logger = require("./config/logger");
const sessionManager = require("./services/session.manager");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.corsOrigin }
});

sessionManager.bindSocket(io);

server.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port}`);
});
