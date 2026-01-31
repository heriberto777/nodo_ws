const { Router } = require("express");
const auth = require("../middlewares/auth.middleware");
const authRoutes = require("./auth.routes");
const linesRoutes = require("./lines.routes");
const messagesRoutes = require("./messages.routes");
const webhooksRoutes = require("./webhooks.routes");
const healthRoutes = require("./health.routes");

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use(auth);
router.use("/lines", linesRoutes);
router.use("/messages", messagesRoutes);
router.use("/webhooks", webhooksRoutes);

module.exports = router;
