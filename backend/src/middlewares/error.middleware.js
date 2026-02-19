const logger = require("../config/logger");

module.exports = (err, req, res, _next) => {
  logger.error("HTTP_ERROR", {
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
    path: req.originalUrl,
    method: req.method
  });

  if (res.headersSent) {
    return;
  }

  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
};
