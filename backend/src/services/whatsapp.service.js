const sessionManager = require("./session.manager");
const env = require("../config/env");

const sendMessage = async ({ lineId, to, message }) => {
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

  return session.client.sendMessage(to, message);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendMessageWithDelay = async ({ lineId, to, message, delayMs }) => {
  const min = env.antiBanMinDelayMs;
  const max = env.antiBanMaxDelayMs;
  const finalDelay = Number.isFinite(delayMs)
    ? delayMs
    : Math.floor(Math.random() * (max - min + 1)) + min;

  if (finalDelay > 0) {
    await sleep(finalDelay);
  }

  return sendMessage({ lineId, to, message });
};

module.exports = { sendMessage, sendMessageWithDelay };
