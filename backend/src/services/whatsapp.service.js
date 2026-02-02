const { Location } = require("whatsapp-web.js");
const sessionManager = require("./session.manager");
const env = require("../config/env");

const sendMessage = async ({ lineId, to, message, type, location }) => {
  const session = sessionManager.getSession(lineId);
  if (!session || !session.ready) {
    const error = new Error("Line not connected");
    error.status = 409;
    throw error;
  }

  if (sessionManager.isSafeMode(lineId)) {
    const error = new Error("Safe mode active");
    error.status = 423;
    throw error;
  }

  let content = message;
  if (type === "location") {
    if (!location || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
      const error = new Error("Invalid location payload");
      error.status = 400;
      throw error;
    }
    content = new Location(location.latitude, location.longitude, {
      name: location.name || undefined,
      address: location.address || undefined,
      url: location.url || undefined
    });
  }

  return session.client.sendMessage(to, content);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendMessageWithDelay = async ({ lineId, to, message, type, location, delayMs }) => {
  const min = env.antiBanMinDelayMs;
  const max = env.antiBanMaxDelayMs;
  const finalDelay = Number.isFinite(delayMs)
    ? delayMs
    : Math.floor(Math.random() * (max - min + 1)) + min;

  if (finalDelay > 0) {
    await sleep(finalDelay);
  }

  return sendMessage({ lineId, to, message, type, location });
};

module.exports = { sendMessage, sendMessageWithDelay };
