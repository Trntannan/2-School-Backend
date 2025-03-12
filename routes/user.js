const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const sharp = require("sharp");
const mongoose = require("mongoose");
const User = require("./models/user");
const TierImage = require("./models/tierImage");
const { ObjectId } = require("mongodb");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
require("dotenv").config();

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET;
const mongoURI = process.env.MONGODB_URI;
const dbName = process.env.DATABASE_NAME;

const app = express();

app.use(express.json());

// Middleware for CORS
app.use(
  cors({
    origin: ["https://two-school-front.onrender.com/", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// MongoDB Connection
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      dbName,
    });
    const migrateExistingGroups = async () => {
      const users = await User.find({});
      for (const user of users) {
        for (const group of user.groups) {
          if (!group.owner) {
            group.owner = user._id;
          }
        }
        await user.save();
      }
    };

    await migrateExistingGroups();
    console.log(`Connected to MongoDB database: ${dbName}`);
    await initializeCollections();
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Initialize User Collection
const initializeCollections = async () => {
  try {
    const userExists = await User.findOne();
    if (!userExists) {
      await new User({
        username: "admin",
        email: "admin@example.com",
        password:
          "$2a$10$ISbs3S7JkHv3IMPhkdaJVuFb515c1Vsn5nvcNVdd74gDvamS/wtuK",
        groups: [],
        profile: {
          bio: "Fricking Admin guy bro....",
          profilePic: {},
        },
      }).save();
      console.log("'users' collection initialized with an initial user");
    }
  } catch (error) {
    console.error("Error initializing collections:", error);
    process.exit(1);
  }
};

// Token Generation
const generateToken = (userId, username, tier) => {
  return jwt.sign({ id: userId, username, tier }, jwtSecret, {
    expiresIn: "1h",
  });
};

// Token Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization token is missing" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    const user = await User.findById(decoded.id);
    if (!user || user.activeToken !== token) {
      return res
        .status(403)
        .json({ message: "Session expired. Please login again" });
    }

    req.userId = decoded.id;
    req.username = decoded.username;
    req.tier = decoded.tier;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
  }
};

// Multer Storage and Upload Setup
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"), false);
    }
  },
});

// User Registration
const registerUser = async (req, res) => {
  const { username, email, password: hashedPassword } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!username || !email || !hashedPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      field: "email",
      message: "Invalid email format",
    });
  }

  try {
    const [existingEmail, existingUsername] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ username }),
    ]);

    if (existingEmail) {
      return res.status(409).json({
        field: "email",
        message: "Email already exists",
        error: true,
      });
    }

    if (existingUsername) {
      let suggestedUsername = username;
      let counter = 1;
      let isAvailable = false;

      while (!isAvailable && counter < 100) {
        const suggestion = `${username}${counter}`;
        const exists = await User.findOne({ username: suggestion });
        if (!exists) {
          suggestedUsername = suggestion;
          isAvailable = true;
        }
        counter++;
      }

      return res.status(409).json({
        field: "username",
        message: "Username already exists",
        suggestion: suggestedUsername,
        error: true,
      });
    }

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    const token = generateToken(newUser._id, newUser.username, newUser.tier);
    newUser.activeToken = token;
    await newUser.save();
    res.status(201).json({
      message: "User registered successfully",
      userId: newUser._id,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid input data",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({
      message: "Error registering user",
      error: error.message,
    });
  }
};

// User Login
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.loginAttempts >= 5) {
      const lastAttempt = user.lastLoginAttempt || new Date(0);
      const lockoutDuration = 15 * 60 * 1000; // 15 minutes
      if (Date.now() - lastAttempt < lockoutDuration) {
        return res.status(429).json({
          message: "Account temporarily locked. Please try again later",
          remainingTime: lockoutDuration - (Date.now() - lastAttempt),
        });
      }
      user.loginAttempts = 0;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      user.loginAttempts += 1;
      user.lastLoginAttempt = new Date();
      await user.save();
      return res.status(401).json({
        message: "Invalid password",
        attemptsRemaining: 5 - user.loginAttempts,
      });
    }

    user.loginAttempts = 0;
    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, tier: user.tier },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    user.activeToken = token;
    await user.save();

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

// rateLimit Middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "You Have Exceeded The Login Limit, Account Locked For 15 Minutes",
});

// Complete User Profile with Profile Picture Handling
const completeUserProfile = async (req, res) => {
  const { childName, SchoolName, bio } = req.body;
  let profilePic = null;

  try {
    if (req.file) {
      const resizedImage = await sharp(req.file.buffer)
        .resize({ width: 200, height: 200 })
        .toFormat("jpeg")
        .toBuffer();
      profilePic = resizedImage.toString("base64");
    }

    const update = { profile: { childName, SchoolName, bio, profilePic } };
    const user = await User.findOneAndUpdate(
      { _id: req.userId },
      { $set: update },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      profile: user.profile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
};

// Fetch User Profile
const getUserProfile = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findOne(
      { _id: new ObjectId(req.userId) },
      { username: 1, profile: 1 }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { username, profile } = user;
    res.status(200).json({ username, profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { username, bio } = req.body;

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ message: "Username is required" });
    }

    let profilePic = null;

    if (req.file) {
      try {
        const resizedImage = await sharp(req.file.buffer)
          .resize({ width: 200, height: 200 })
          .toFormat("jpeg")
          .toBuffer();
        profilePic = resizedImage.toString("base64");
      } catch (imageError) {
        return res.status(400).json({ message: "Error processing image" });
      }
    } else {
      profilePic = req.body.profilePic;
    }

    const update = { username, profile: { bio, profilePic } };
    const user = await User.findOneAndUpdate(
      { _id: req.userId },
      { $set: update },
      { new: true }
    );

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
    res.status(500).json({
      message: "Error updating profile",
      error: error.message,
    });
  }
};

// Delete User Account
const deleteAccount = async (req, res) => {
  try {
    await User.deleteOne({ _id: req.userId });
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Error deleting account" });
  }
};

// Group Handling (new, get, delete)
const newGroup = async (req, res) => {
  const { name, startTime, routes } = req.body;

  if (!name || !startTime || !routes) {
    return res
      .status(400)
      .json({ message: "Missing required group information" });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.groups.length >= 5 && user.tier !== "DIAMOND") {
      return res
        .status(403)
        .json({ message: "Maximum group limit reached for your tier" });
    }

    const addGroup = {
      name,
      startTime,
      routes,
      owner: user._id,
      createdAt: new Date(),
      members: [
        {
          userId: user._id,
          username: user.username,
          role: "admin",
        },
      ],
    };

    user.groups.push(addGroup);
    await user.save();

    res.status(201).json({
      message: "Group created successfully",
      group: addGroup,
    });
  } catch (error) {
    console.error("Group creation error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid group data",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({
      message: "Failed to create group",
      error: error.message,
    });
  }
};

// get user groups
const getGroup = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("groups");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Error fetching groups" });
  }
};

// get every group in the 'users' collection
const getAllGroups = async (req, res) => {
  try {
    const userId = req.userId;
    const users = await User.find().lean();
    const allGroups = [];

    for (const user of users) {
      if (user._id.toString() === userId) {
        continue;
      }
      if (user.groups.length > 0) {
        allGroups.push(...user.groups);
      }
    }
    if (allGroups.length === 0) {
      return res.status(404).json({ message: "No groups found." });
    }
    res.status(200).json(allGroups);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ message: "Error fetching groups" });
  }
};

// Delete Group
const deleteGroup = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }
    const deletedGroup = await User.findOneAndUpdate(
      { _id: req.userId },
      { $pull: { groups: { _id: req.body.groupId } } },
      { new: true }
    );
    console.log("groupId: ", req.body.groupId);
    if (!deletedGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.json({ message: "Error deleting group", error: error.message });
  }
};

// logout user
const logoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.activeToken = null;
    await user.save();
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error during logout" });
  }
};

// make request, find group in 'users' collection by groupId, add userId to requests array in group
const joinRequest = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!req.body.groupId || !ObjectId.isValid(req.body.groupId)) {
      return res.status(400).json({ message: "Invalid group ID format" });
    }

    const groupId = new ObjectId(req.body.groupId);

    const groupExists = await User.findOne({ "groups._id": groupId });
    if (groupExists) {
      const result = await User.updateOne(
        { "groups._id": groupId },
        {
          $push: {
            "groups.$.requests": {
              username: user.username,
              userId: user._id,
            },
          },
        }
      );
      return res
        .status(200)
        .json({ message: "Join request sent successfully" });
    }
    if (!groupExists) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.status(200).json({ message: "Join request sent successfully" });
  } catch (error) {
    console.error("Error processing join request:", error);
    res.status(500).json({ message: "Error processing request" });
  }
};

// update qrCode with qrData
const updateQr = async (req, res) => {
  try {
    const { qrData } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.qrCode = qrData;
    await user.save();

    res.status(200).json({ message: "QR code updated successfully" });
  } catch (error) {
    console.error("Error updating QR code:", error);
    res.status(500).json({ message: "Error updating QR code" });
  }
};

// get all requests
const getRequests = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const groupsWithRequests = user.groups.filter(
      (group) => group.requests && group.requests.length > 0
    );

    if (groupsWithRequests.length === 0) {
      return res.status(200).json({
        message: "No pending requests found",
        requests: [],
      });
    }

    const requestsWithUserDetails = await Promise.all(
      groupsWithRequests.flatMap((group) =>
        group.requests.map(async (request) => {
          const requestingUser = await User.findById(request.userId);
          if (!requestingUser) {
            return null;
          }
          return {
            requestId: request._id,
            userId: request.userId,
            groupId: group._id,
            groupName: group.name,
            status: request.status,
            user: {
              username: requestingUser.username,
              profile: requestingUser.profile,
              bio: requestingUser.bio,
              tier: requestingUser.tier,
            },
          };
        })
      )
    );

    const validRequests = requestsWithUserDetails.filter(
      (request) => request !== null
    );

    res.status(200).json(validRequests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    res.status(500).json({
      message: "Error fetching requests",
      error: error.message,
    });
  }
};

//Accept request
const acceptRequest = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { userId, groupId, username, tier } = req.body;
    const group = user.groups.find((group) => group._id.toString() === groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    updateOperation = {};
    if (tier === "DIAMOND" || tier === "GOLD") {
      updateOperation.$pull = { "groups.$.requests": { username } };
      updateOperation.$push = {
        "groups.$.members": {
          username,
          userId,
          tier,
        },
      };

      // if tier is DIAMOND or GOLD, add user to members array
    } else {
      updateOperation.$set = {
        "groups.$.requests.$[request].status": "SCAN",
      };
    }

    const updatedUser = await User.findOneAndUpdate(
      { "groups._id": groupId },
      updateOperation,
      {
        new: true,
        arrayFilters: [{ "request.username": username }],
      }
    );

    res.status(200).json({
      message: "Request processed successfully",
      requiresQR: tier === "SILVER" || tier === "BRONZE",
    });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ message: "Error processing request" });
  }
};

// Deny request
const denyRequest = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { groupId, username } = req.body;

    const result = await User.updateOne(
      { "groups._id": groupId },
      {
        $pull: {
          "groups.$.requests": { username },
        },
      }
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({ message: "Request denied successfully" });
    } else {
      res.status(404).json({ message: "Request not found" });
    }
  } catch (error) {
    console.error("Error denying request:", error);
    res.status(500).json({ message: "Error processing deny request" });
  }
};

// check username exists, if it does return error with suggestion
const checkUsername = async (req, res) => {
  try {
    const username = req.params.username;
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      let suggestedUsername = username;
      let counter = 1;
      let isAvailable = false;

      while (!isAvailable) {
        const suggestion = `${username}${counter}`;
        const exists = await User.findOne({ username: suggestion });
        if (!exists) {
          suggestedUsername = suggestion;
          isAvailable = true;
        }
        counter++;
      }

      return res.status(400).json({
        field: "username",
        message: "Username already in use.",
        suggestion: suggestedUsername,
      });
    }

    res.status(200).json({ message: "Username is available" });
  } catch (error) {
    res.status(500).json({ message: "Error checking username" });
  }
};

// get current tier
const getUserTier = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ tier: user.tier });
  } catch (error) {
    res.status(500).json({ message: "Error fetching tier" });
  }
};

// Verify member
const verifyMember = async (req, res) => {
  try {
    const { scannedUsername, groupId } = req.body;

    const user = await User.findOne({
      "groups._id": groupId,
      "groups.requests": {
        $elemMatch: {
          username: scannedUsername,
          status: "SCAN",
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Invalid verification" });
    }

    const result = await User.updateOne(
      { "groups._id": groupId },
      {
        $pull: { "groups.$.requests": { username: scannedUsername } },
        $push: {
          "groups.$.members": {
            username: scannedUsername,
            joinedAt: new Date(),
          },
        },
      }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error verifying member" });
  }
};

router.post("/register", registerUser);
router.post("/login", loginLimiter, loginUser);
router.post(
  "/complete-profile",
  authenticateToken,
  upload.single("profilePic"),
  completeUserProfile
);
router.put(
  "/update-profile",
  authenticateToken,
  upload.single("profilePic"),
  updateUserProfile
);
router.get("/get-profile", authenticateToken, getUserProfile);
router.get("/get-group", authenticateToken, getGroup);
router.get("/all-groups", authenticateToken, getAllGroups);
router.post("/new-group", authenticateToken, newGroup);
router.delete("/delete-group", authenticateToken, deleteGroup);
router.delete("/delete-account", authenticateToken, deleteAccount);
router.get("/initialize-server", initializeCollections);
router.post("/join-request", authenticateToken, joinRequest);
router.post("/update-qr", authenticateToken, updateQr);
router.get("/get-requests", authenticateToken, getRequests);
router.post("/accept-request", authenticateToken, acceptRequest);
router.get("/check-username/:username", checkUsername);
router.post("/deny-request", authenticateToken, denyRequest);
router.get("/current-tier", authenticateToken, getUserTier);
router.post("/verify-member", authenticateToken, verifyMember);
router.post("/logout", authenticateToken, logoutUser);

module.exports = router;
