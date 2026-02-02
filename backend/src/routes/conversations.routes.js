const { Router } = require("express");
const controller = require("../controllers/conversations.controller");

const router = Router();

router.get("/", controller.list);
router.get("/:id", controller.getById);
router.get("/:id/messages", controller.listMessages);
router.patch("/:id", controller.updateStatus);
router.post("/:id/reply", controller.reply);

module.exports = router;
