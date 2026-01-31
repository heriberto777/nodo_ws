const { Router } = require("express");
const asyncHandler = require("../utils/async-handler");
const requireRole = require("../middlewares/role.middleware");
const messagesController = require("../controllers/messages.controller");

const router = Router();

router.post("/send", requireRole(["admin", "operator"]), asyncHandler(messagesController.send));

module.exports = router;
