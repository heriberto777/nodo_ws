const { createAuditLog } = require("../models/audit.model");

const shouldLog = (req) => ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

const sanitizeBody = (body) => {
  if (!body || typeof body !== "object") return body;
  const clone = { ...body };
  if (clone.password) delete clone.password;
  if (clone.passwordHash) delete clone.passwordHash;
  return clone;
};

module.exports = async (req, res, next) => {
  if (!shouldLog(req)) return next();

  res.on("finish", async () => {
    if (res.statusCode >= 400) return;
    try {
      await createAuditLog({
        userId: req.user?.id || null,
        action: req.method,
        resource: req.originalUrl,
        details: {
          params: req.params,
          body: sanitizeBody(req.body)
        }
      });
    } catch (error) {
      // ignore audit errors
    }
  });

  next();
};
