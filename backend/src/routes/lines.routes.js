const { Router } = require("express");
const asyncHandler = require("../utils/async-handler");
const requireRole = require("../middlewares/role.middleware");
const linesController = require("../controllers/lines.controller");

const router = Router();

router.get("/", asyncHandler(linesController.list));
router.post("/", requireRole(["admin"]), asyncHandler(linesController.create));
router.post("/:id/connect", requireRole(["admin", "operator"]), asyncHandler(linesController.connect));
router.post("/:id/disconnect", requireRole(["admin", "operator"]), asyncHandler(linesController.disconnect));

module.exports = router;
