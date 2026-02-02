const { Router } = require("express");
const controller = require("../controllers/warmup.controller");

const router = Router();

router.get("/:lineId", controller.getByLine);
router.patch("/:lineId", controller.updateByLine);

module.exports = router;
