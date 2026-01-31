const { Router } = require("express");
const asyncHandler = require("../utils/async-handler");
const authController = require("../controllers/auth.controller");

const router = Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));

module.exports = router;
