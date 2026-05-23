const express = require("express");
const messageController = require("../controllers/messageController");
const authController = require("../controllers/authController");
const router = express.Router();

router.get("/", authController.protect, messageController.getAllMessages);

router
  .route("/:receiverId")
  .get(authController.protect, messageController.getMessage);

router
  .route("/send-message/:receiverId")
  .post(authController.protect, messageController.sendMessage);

router
  .route("/delete-message/:messageId")
  .delete(authController.protect, messageController.deleteMessage);

module.exports = router;
