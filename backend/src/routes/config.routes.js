const { Router } = require("express");
const {
  readRuntimeConfig,
  writeRuntimeConfig
} = require("../controllers/config.controller");

const router = Router();

router.get("/runtime", readRuntimeConfig);
router.post("/runtime", writeRuntimeConfig);

module.exports = router;
