const userService = require("../services/userService");
const authService = require("../services/authService");
const { processImage } = require("../utils/imageUpload");

exports.registerUser = async (req, res) => {
  const { username, email, password: hashedPassword } = req.body;

  try {
    if (!(await authService.validateEmail(email))) {
      return res.status(400).json({
        field: "email",
        message: "Invalid email format",
      });
    }

    const { existingEmail, existingUsername } =
      await authService.checkExistingUser(email, username);

    if (existingEmail) {
      return res.status(409).json({
        field: "email",
        message: "Email already exists",
        error: true,
      });
    }

    if (existingUsername) {
      const suggestedUsername = await authService.generateUsernameVariation(
        username
      );
      return res.status(409).json({
        field: "username",
        message: "Username already exists",
        suggestion: suggestedUsername,
        error: true,
      });
    }

    const { newUser, token } = await authService.register({
      username,
      email,
      password: hashedPassword,
    });
    res.status(201).json({
      message: "User registered successfully",
      userId: newUser._id,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Error registering user",
      error: error.message,
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const result = await authService.login(username, password);

    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }

    if (result.locked) {
      return res.status(429).json({
        message: "Account temporarily locked. Please try again later",
        remainingTime: result.remainingTime,
      });
    }

    if (result.failed) {
      return res.status(401).json({
        message: "Invalid password",
        attemptsRemaining: result.attemptsRemaining,
      });
    }

    const { user, token } = result;
    res.status(200).json({
      message: "Login successful",
      token,
      userId: user._id.toString(),
      username: user.username,
      tier: user.tier,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal server error during login",
      error: error.message,
    });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { username, bio } = req.body;
    if (!username || username.trim().length === 0) {
      return res.status(400).json({ message: "Username is required" });
    }

    let profilePic = null;
    if (req.file) {
      const resizedImage = await processImage(req.file.buffer);
      profilePic = resizedImage.toString("base64");
    } else {
      profilePic = req.body.profilePic;
    }

    const user = await userService.updateUserProfile(req.userId, {
      username,
      profile: { bio, profilePic },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      profile: user.profile,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Username already exists" });
    }
    res.status(500).json({ message: "Error updating profile" });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await userService.findUserById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      username: user.username,
      profile: user.profile,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const groups = await userService.getUserGroups(req.userId);
    if (!groups) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Error fetching groups" });
  }
};

exports.getAllGroups = async (req, res) => {
  try {
    const allGroups = await userService.getAllGroups(req.userId);
    if (allGroups.length === 0) {
      return res.status(404).json({ message: "No groups found." });
    }
    res.status(200).json(allGroups);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ message: "Error fetching groups" });
  }
};

exports.newGroup = async (req, res) => {
  try {
    const { name, startTime, routes } = req.body;
    const group = await userService.addGroupToUser(req.userId, {
      name,
      startTime,
      routes,
      owner: req.userId,
      createdAt: new Date(),
      members: [{ userId: req.userId, username: req.username, role: "admin" }],
    });
    res.status(201).json(group);
  } catch (error) {
    console.error("Group creation error:", error);
    res.status(500).json({ message: "Failed to create group" });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const result = await userService.removeGroupFromUser(
      req.userId,
      req.params.groupId
    );
    if (!result) {
      return res.status(404).json({ message: "Group not found" });
    }
    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ message: "Failed to delete group" });
  }
};

exports.joinRequest = async (req, res) => {
  try {
    const user = await userService.findUserById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await userService.processJoinRequest(req.body.groupId, {
      username: user.username,
      userId: user._id,
    });

    res.status(200).json({ message: "Join request sent successfully" });
  } catch (error) {
    console.error("Error processing join request:", error);
    res.status(500).json({ message: "Error processing request" });
  }
};

exports.updateQr = async (req, res) => {
  try {
    await userService.updateQrCode(req.userId, req.body.qrData);
    res.status(200).json({ message: "QR code updated successfully" });
  } catch (error) {
    console.error("Error updating QR code:", error);
    res.status(500).json({ message: "Error updating QR code" });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const requests = await userService.getGroupRequests(req.userId);
    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ message: "Error fetching requests" });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const { userId, groupId, username, tier } = req.body;
    await userService.processRequestResponse(groupId, username, true, tier);
    res.status(200).json({
      message: "Request processed successfully",
      requiresQR: tier === "SILVER" || tier === "BRONZE",
    });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ message: "Error processing request" });
  }
};

exports.denyRequest = async (req, res) => {
  try {
    const { groupId, username } = req.body;
    await userService.processRequestResponse(groupId, username, false);
    res.status(200).json({ message: "Request denied successfully" });
  } catch (error) {
    console.error("Error denying request:", error);
    res.status(500).json({ message: "Error processing deny request" });
  }
};

exports.verifyMember = async (req, res) => {
  try {
    const { scannedUsername, groupId } = req.body;
    await userService.verifyMember(groupId, scannedUsername);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error verifying member:", error);
    res.status(500).json({ message: "Error verifying member" });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    await authService.logout(req.userId);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error during logout" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await userService.deleteUser(req.userId);
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Error deleting account" });
  }
};
