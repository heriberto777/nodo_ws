const jwt = require("jsonwebtoken");
const env = require("../config/env");

const unauthorized = (res, message = "Unauthorized") => {
  return res.status(401).json({ message });
};

module.exports = (req, res, next) => {
  const providedApiKey = req.headers["x-api-key"];
  if (env.apiKey) {
    if (providedApiKey && providedApiKey === env.apiKey) {
      req.authContext = { type: "api-key" };
      return next();
    }
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (env.jwtSecret && token) {
    try {
      const payload = jwt.verify(token, env.jwtSecret);
      req.user = payload;
      req.authContext = { type: "jwt", user: payload };
      return next();
    } catch (error) {
      return unauthorized(res);
    }
  }

  if (!env.jwtSecret && !env.apiKey) {
    return res.status(500).json({ message: "Authentication not configured" });
  }

  return unauthorized(res);
};
