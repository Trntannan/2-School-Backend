const express = require("express");
const router = express.Router();
const userController = require("./controllers/userController");
const authenticateToken = require("./middlewares/authenticateToken");
const { upload } = require("./utils/imageUpload");
const loginLimiter = require("./middlewares/rateLimiter");
const cors = require("./middlewares/cors");

// Apply global middleware
router.use(cors);
router.use(apiLimiter);

// Auth routes
router.post("/register", userController.registerUser);
router.post("/login", loginLimiter, userController.loginUser);
router.post("/logout", authenticateToken, userController.logoutUser);

// Profile routes
router.get("/get-profile", authenticateToken, userController.getUserProfile);
router.put(
  "/update-profile",
  authenticateToken,
  upload.single("profilePic"),
  userController.updateUserProfile
);
router.delete(
  "/delete-account",
  authenticateToken,
  userController.deleteAccount
);

// Group routes
router.get("/get-group", authenticateToken, userController.getGroup);
router.get("/all-groups", authenticateToken, userController.getAllGroups);
router.post("/new-group", authenticateToken, userController.newGroup);
router.delete("/delete-group", authenticateToken, userController.deleteGroup);

// Request routes
router.post("/join-request", authenticateToken, userController.joinRequest);
router.get("/get-requests", authenticateToken, userController.getRequests);
router.post("/accept-request", authenticateToken, userController.acceptRequest);
router.post("/deny-request", authenticateToken, userController.denyRequest);

// QR and verification routes
router.post("/update-qr", authenticateToken, userController.updateQr);
router.post("/verify-member", authenticateToken, userController.verifyMember);

router.get("/check-username/:username", userController.checkUsername);
router.get("/current-tier", authenticateToken, userController.getUserTier);

module.exports = router;
