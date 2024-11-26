const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const sharp = require("sharp");
const mongoose = require("mongoose");
const User = require("../models/user");
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
    origin: "*",
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
        profile: {
          bio: "Fricking Bob bro....",
          profilePic: {},
        },
        group: {
          name: "The First",
          startTime: "2024-11-08T02:16:00.000+00:00",
          routes: [
            {
              start: {
                latitude: "-36.89204110000001",
                longitude: "174.618699",
              },
              end: {
                latitude: "-36.8885554",
                longitude: "174.6230991",
              },
              waypoints: [],
            },
          ],
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
const generateToken = (userId) => {
  return jwt.sign({ id: userId.toString() }, jwtSecret, { expiresIn: "1h" });
};

// Token Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization token is missing" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.id;
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

  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    const token = generateToken(newUser._id);
    res.status(201).json({ message: "User registered successfully", token });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ message: "Error registering user" });
  }
};

// User Login
const loginUser = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.loginAttempts >= 5) {
    return res.status(403).json({
      message:
        "Account locked due to too many failed login attempts. Contact support.",
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    user.loginAttempts += 1;
    await user.save();
    console.log(`Login attempt failed: ${user.loginAttempts} times`);
    return res.status(401).json({ message: "Invalid password" });
  }

  user.loginAttempts = 0;
  await user.save();

  const token = generateToken(user._id);
  res.status(200).json({ message: "Login successful", token });
};

// rateLimit Middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "You Have Exceeded The Login Limit, Account Locked For 15 Minutes",
});

// Complete User Profile with Profile Picture Handling
const completeUserProfile = async (req, res) => {
  const { bio } = req.body;
  let profilePic = null;

  try {
    if (req.file) {
      const resizedImage = await sharp(req.file.buffer)
        .resize({ width: 200, height: 200 })
        .toFormat("jpeg")
        .toBuffer();
      profilePic = resizedImage.toString("base64");
    }

    const update = { profile: { bio, profilePic } };
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
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateUserProfile = async (req, res) => {
  const { username, bio } = req.body;
  let profilePic = null;

  if (req.file) {
    const resizedImage = await sharp(req.file.buffer)
      .resize({ width: 200, height: 200 })
      .toFormat("jpeg")
      .toBuffer();
    profilePic = resizedImage.toString("base64");
  } else {
    profilePic = req.body.profilePic;
  }

  const update = { username, profile: { bio, profilePic } };
  const user = await User.findOneAndUpdate(
    { _id: req.userId },
    { $set: update },
    { new: true }
  );

  if (user) {
    res.json({
      message: "Profile updated successfully",
      profile: user.profile,
    });
  } else {
    res.status(404).json({ message: "User not found" });
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

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const addGroup = { name, startTime, routes };
    user.groups.push(addGroup);
    await user.save();

    res.status(201).json(addGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Failed to create group" });
  }
};

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
    const users = await User.find().lean();
    const allGroups = [];

    for (const user of users) {
      if (user.groups.length > 0) {
        console.log("Sending response with ", user.username);
        allGroups.push(...user.groups);
      }
    }

    if (!users) {
      return res.status(404).json({ message: "Users not found" });
    }

    res.status(200).json(allGroups);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ message: "Error fetching groups" });
  }
};

// Delete group by group _id
const deleteGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const group = user.groups.find((group) => group._id.toString() === groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    user.groups = user.groups.filter(
      (group) => group._id.toString() !== groupId
    );
    await user.save();

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ message: "Error deleting group" });
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

module.exports = { router, connectToMongoDB, User };
