const { Router } = require("express");
const controller = require("../controllers/audit.controller");

const router = Router();

router.get("/", controller.list);

module.exports = router;
