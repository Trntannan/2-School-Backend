const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/register", userController.registerUser);
router.get("/:userId/profile", userController.getUserProfile);
router.put("/:userId/profile", userController.updateUserProfile);
router.post("/:userId/groups", userController.createGroup);
router.delete("/:userId/groups/:groupId", userController.deleteGroup);

module.exports = router;
