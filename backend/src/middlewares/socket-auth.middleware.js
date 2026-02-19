const jwt = require("jsonwebtoken");
const env = require("../config/env");

const buildUnauthorizedError = (message = "Unauthorized") => {
  const error = new Error(message);
  error.data = { code: "SOCKET_UNAUTHORIZED" };
  return error;
};

module.exports = (socket, next) => {
  try {
    const headers = socket.handshake?.headers || {};
    const lowerCaseHeaders = Object.keys(headers).reduce((acc, key) => {
      acc[key.toLowerCase()] = headers[key];
      return acc;
    }, {});

    const providedApiKey = lowerCaseHeaders["x-api-key"];
    if (env.apiKey && providedApiKey && providedApiKey === env.apiKey) {
      socket.authContext = { type: "api-key" };
      return next();
    }

    const authHeader = lowerCaseHeaders.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return next(buildUnauthorizedError());
    }

    if (!env.jwtSecret) {
      return next(buildUnauthorizedError("Socket JWT secret not configured"));
    }

    const payload = jwt.verify(token, env.jwtSecret);
    socket.authContext = { type: "jwt", user: payload };
    return next();
  } catch (error) {
    return next(buildUnauthorizedError());
  }
};
