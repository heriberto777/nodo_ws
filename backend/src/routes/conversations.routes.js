const { Router } = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/conversations.controller");

const router = Router();

router.get("/", asyncHandler(controller.list));
router.get("/:id", asyncHandler(controller.getById));
router.get("/:id/messages", asyncHandler(controller.listMessages));
router.patch("/:id", asyncHandler(controller.updateStatus));
router.post("/:id/reply", asyncHandler(controller.reply));

module.exports = router;
