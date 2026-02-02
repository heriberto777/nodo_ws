const { Router } = require("express");
const controller = require("../controllers/risk.controller");

const router = Router();

router.get("/", controller.list);
router.get("/score", controller.score);
router.get("/score-all", controller.scoreAll);

module.exports = router;
