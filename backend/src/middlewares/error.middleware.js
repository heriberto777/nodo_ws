const logger = require("../config/logger");

module.exports = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
  return next();
};
