const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.get("/:userId/profile", userController.getUserProfile);
router.put("/:userId/profile", userController.updateUserProfile);
router.post("/:userId/profile", userController.completeUserProfile);
router.post("/:userId/groups", userController.createGroup);
router.get("/:userId/groups", userController.getGroup);
router.delete("/:userId/groups/:groupId", userController.deleteGroup);
router.delete("/:userId", userController.deleteAccount);
router.get("/initialize-server", userController.initializeCollections);

module.exports = router;
