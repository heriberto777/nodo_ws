const { Router } = require("express");
const asyncHandler = require("../utils/async-handler");
const webhooksController = require("../controllers/webhooks.controller");

const router = Router();

router.post("/n8n/inbound", asyncHandler(webhooksController.inbound));
router.post("/n8n/status", asyncHandler(webhooksController.status));

module.exports = router;
