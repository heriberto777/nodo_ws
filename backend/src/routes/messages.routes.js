const { Router } = require("express");
const asyncHandler = require("../utils/async-handler");
const requireRole = require("../middlewares/role.middleware");
const messagesController = require("../controllers/messages.controller");

const router = Router();

router.post("/send", requireRole(["admin", "operator"]), asyncHandler(messagesController.send));
router.get("/recent", requireRole(["admin", "operator", "viewer"]), asyncHandler(messagesController.recent));

module.exports = router;
