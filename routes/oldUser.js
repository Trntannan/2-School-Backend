const express = require("express");
const router = express.Router();
const userController = require("./controllers/userController");
const rateLimiter = require("./middlewares/rateLimiter");

router.post("/register", userController.registerUser);
router.post("/login", rateLimiter, userController.loginUser);
router.post("/complete-profile", userController.completeUserProfile);
router.put("/update-profile", userController.updateUserProfile);
router.get("/get-profile", userController.getUserProfile);
router.get("/get-group", userController.getGroup);
router.get("/all-groups", userController.getAllGroups);
router.post("/new-group", userController.newGroup);
router.delete("/delete-group", userController.deleteGroup);
router.delete("/delete-account", userController.deleteAccount);

module.exports = router;
