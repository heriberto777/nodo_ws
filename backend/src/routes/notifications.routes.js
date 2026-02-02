const { Router } = require("express");
const controller = require("../controllers/notifications.controller");

const router = Router();

router.get("/", controller.list);
router.get("/unread", controller.unread);
router.post("/read-all", controller.markAll);
router.post("/clear", controller.clear);
router.post("/:id/read", controller.markOneRead);

module.exports = router;
