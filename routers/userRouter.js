const express = require("express");
const authController = require("./../controllers/authController");
const userController = require("./../controllers/userController");
const router = express.Router();

router.post("/signup/request-otp", authController.createAndSendOtp);
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

// router.use("/calling");

router.route("/getMe").post(authController.protect, authController.getMe);

router.route("/").get(authController.protect, userController.getUsers);

router
  .route("/password-change")
  .patch(authController.protect, authController.changePassword);

router.get("/chat-users", authController.protect, userController.getChatUsers);

router
  .route("/getUser/:id")
  .get(authController.protect, userController.getUser);

router.patch("/update-me", authController.protect, userController.updateMe);

router.post(
  "/forgotten-password",
  authController.createAndSendForgottenPasswordOtp,
);

router.post("/verify-reset-otp", authController.verifyResetOtp);

router.patch("/resetpassword/:token", authController.resetPassword);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(authController.protect, userController.updateMe);

module.exports = router;
