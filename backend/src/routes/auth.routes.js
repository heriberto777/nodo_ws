const { Router } = require("express");
const asyncHandler = require("../utils/async-handler");
const optionalAuth = require("../middlewares/optional-auth.middleware");
const authController = require("../controllers/auth.controller");

const router = Router();

router.post("/register", optionalAuth, asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));

module.exports = router;
