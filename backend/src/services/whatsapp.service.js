const sessionManager = require("./session.manager");

const sendMessage = async ({ lineId, to, message }) => {
  const session = sessionManager.getSession(lineId);
  if (!session || !session.ready) {
    const error = new Error("Line not connected");
    error.status = 409;
    throw error;
  }

  return session.client.sendMessage(to, message);
};

module.exports = { sendMessage };
