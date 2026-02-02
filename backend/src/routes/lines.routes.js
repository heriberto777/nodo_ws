const { Router } = require("express");
const asyncHandler = require("../utils/async-handler");
const requireRole = require("../middlewares/role.middleware");
const linesController = require("../controllers/lines.controller");

const router = Router();

router.get("/", asyncHandler(linesController.list));
router.get("/active-sessions", requireRole(["admin", "operator"]), asyncHandler(linesController.listActiveSessions));
router.use((req, res, next) => {
	res.set("Cache-Control", "no-store");
	next();
});
router.post("/", requireRole(["admin"]), asyncHandler(linesController.create));
router.post("/:id/connect", requireRole(["admin", "operator"]), asyncHandler(linesController.connect));
router.post("/:id/disconnect", requireRole(["admin", "operator"]), asyncHandler(linesController.disconnect));
router.get("/:id/settings", requireRole(["admin", "operator"]), asyncHandler(linesController.getSettings));
router.get("/:id/qr", requireRole(["admin", "operator"]), asyncHandler(linesController.getQr));
router.post("/:id/qr/reset", requireRole(["admin", "operator"]), asyncHandler(linesController.resetQr));
router.post("/:id/qr/cleanup", requireRole(["admin", "operator"]), asyncHandler(linesController.cleanupSession));
router.post("/:id/lock/release", requireRole(["admin", "operator"]), asyncHandler(linesController.releaseLock));
router.put("/:id/webhook", requireRole(["admin"]), asyncHandler(linesController.updateLineWebhook));
router.put("/:id/ratelimit", requireRole(["admin"]), asyncHandler(linesController.updateLineRateLimit));
router.put("/:id/settings", requireRole(["admin"]), asyncHandler(linesController.updateSettings));
router.get("/:id/safe-mode", requireRole(["admin"]), asyncHandler(linesController.getSafeMode));
router.post("/:id/safe-mode/reset", requireRole(["admin"]), asyncHandler(linesController.resetSafeMode));
router.delete("/:id", requireRole(["admin"]), asyncHandler(linesController.remove));

module.exports = router;
