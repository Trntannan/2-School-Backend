const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const sharp = require("sharp");
const mongoose = require("mongoose");
const User = require("../models/user");
const { ObjectId } = require("mongodb");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET;
const mongoURI = process.env.MONGODB_URI;
const dbName = process.env.DATABASE_NAME;

const app = express();

app.use(express.json());

// Middleware for CORS
app.use((res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

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
        username: "init-user",
        email: "init@example.com",
        password: "a",
        profile: {
          school: "Initial School",
          kidCount: 1,
          bio: "This is the initial user profile bio.",
          profilePic: {
            data: Buffer.alloc(0),
            contentType: "image/png",
          },
        },
        group: {
          name: "Initial Group",
          startTime: new Date(),
          creator: null,
          members: [],
          routes: [
            {
              start: {
                latitude: 0,
                longitude: 0,
              },
              end: {
                latitude: 0,
                longitude: 0,
              },
              waypoints: [
                {
                  name: "Initial Waypoint",
                  latitude: 0,
                  longitude: 0,
                },
              ],
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
  const { username, email, password } = req.body;
  if (!/^[a-zA-Z0-9._%+-]+@example\.com$/.test(email)) {
    return res
      .status(400)
      .json({ message: "Email must be in '@example.com' domain" });
  }
  if (
    !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!.%*?&])[A-Za-z\d@$!.%*?&]{8,}$/.test(
      password
    )
  ) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters and include uppercase, number, and special character",
    });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      groupAdded: false,
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
  const { school, kidCount, bio } = req.body;
  let profilePic = null;

  try {
    if (req.file) {
      const resizedImage = await sharp(req.file.buffer)
        .resize({ width: 200, height: 200 })
        .toFormat("jpeg")
        .toBuffer();
      profilePic = resizedImage.toString("base64");
    }

    const update = { profile: { school, kidCount, bio, profilePic } };
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
  const { username, school, kidCount, bio } = req.body;
  let profilePic = null;

  try {
    if (req.file) {
      const resizedImage = await sharp(req.file.buffer)
        .resize({ width: 200, height: 200 })
        .toFormat("jpeg")
        .toBuffer();
      profilePic = resizedImage.toString("base64");
    }

    const update = {
      ...(username && { username }),
      ...(school && { "profile.school": school }),
      ...(kidCount && { "profile.kidCount": kidCount }),
      ...(bio && { "profile.bio": bio }),
      ...(profilePic && { "profile.profilePic": profilePic }),
    };

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: update },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      profile: user.profile,
      username: user.username,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile" });
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

// newGroup
router.post("/new-group", authenticateToken, async (req, res) => {
  const { name, startTime, routes } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newGroup = {
      name,
      startTime,
      creator: user._id,
      members: [user._id],
      routes,
      createdAt: new Date(),
    };

    user.groups.push(newGroup);
    await user.save();

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Failed to create group" });
  }
});

// getGroup
router.get("/groups", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("groups.members");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Failed to fetch groups" });
  }
});

// Delete Group from User
const handleDelete = async (req, res) => {
  try {
    const groupId = new mongoose.Types.ObjectId(req.body.groupId);
    await User.updateOne(
      { _id: req.userId },
      { $pull: { groups: { _id: groupId } } }
    );
    res.json({ message: "Group deleted successfully" });
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
router.post("/new-group", authenticateToken, newGroup);
router.delete("/delete-group", authenticateToken, handleDelete);
router.delete("/delete-account", authenticateToken, deleteAccount);
router.get("/initialize-server", initializeCollections);

module.exports = { router, connectToMongoDB, User };
