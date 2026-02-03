const { Router } = require("express");
const auth = require("../middlewares/auth.middleware");
const authRoutes = require("./auth.routes");
const configRoutes = require("./config.routes");
const linesRoutes = require("./lines.routes");
const messagesRoutes = require("./messages.routes");
const settingsRoutes = require("./settings.routes");
const webhooksRoutes = require("./webhooks.routes");
const healthRoutes = require("./health.routes");
const conversationsRoutes = require("./conversations.routes");
const botflowsRoutes = require("./botflows.routes");
const warmupRoutes = require("./warmup.routes");
const riskRoutes = require("./risk.routes");
const auditRoutes = require("./audit.routes");
const auditMiddleware = require("../middlewares/audit.middleware");
const notificationsRoutes = require("./notifications.routes");
const metricsRoutes = require("./metrics.routes");

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/config", configRoutes);
router.use(auth);
router.use(auditMiddleware);
router.use("/lines", linesRoutes);
router.use("/messages", messagesRoutes);
router.use("/conversations", conversationsRoutes);
router.use("/bot-flows", botflowsRoutes);
router.use("/warmup", warmupRoutes);
router.use("/risk-events", riskRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/metrics", metricsRoutes);
router.use("/settings", settingsRoutes);
router.use("/webhooks", webhooksRoutes);

module.exports = router;
