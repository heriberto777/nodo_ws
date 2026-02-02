const { Router } = require("express");
const controller = require("../controllers/metrics.controller");

const router = Router();

router.get("/summary", controller.summary);
router.get("/kpis", controller.kpis);
router.get("/lines", controller.lineMetrics);
router.post("/report-now", controller.sendReportNow);

module.exports = router;
