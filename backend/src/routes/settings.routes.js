const { Router } = require("express");
const asyncHandler = require("../utils/async-handler");
const requireRole = require("../middlewares/role.middleware");
const settingsController = require("../controllers/settings.controller");

const router = Router();

router.get("/", asyncHandler(settingsController.get));
router.put("/", requireRole(["admin"]), asyncHandler(settingsController.update));

module.exports = router;
