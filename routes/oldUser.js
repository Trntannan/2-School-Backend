const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const sharp = require("sharp");
const mongoose = require("mongoose");
const User = require("../models/user");
const Group = require("../models/group");
const { ObjectId } = require("mongodb");
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
    console.log(Connected to MongoDB database: ${dbName});
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
      }).save();
      console.log("'users' collection initialized");
    }

    const groupExists = await Group.findOne();
    if (!groupExists) {
      await new Group({
        name: "init-group",
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
                name: "init-waypoint",
                latitude: 0,
                longitude: 0,
              },
            ],
            createdAt: new Date(),
          },
        ],
        startTime: new Date(),
        walkTime: 30,
      }).save();
      console.log("'groups' collection initialized");
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
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
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
  try {
    const user = await User.findOne({ username });
    console.log("user from DB:", user);

    if (username === "" || password === "") {
      return res.status(400).json({ message: "Please fill in all fields" });
    }
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("passwordMatch:", passwordMatch);
    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    const token = generateToken(user._id);
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Error logging in" });
  }
};

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
    if (!ObjectId.isValid(req.userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findOne(
      { _id: new ObjectId(req.userId) },
      { username: 1, profile: 1 }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { username, profile } = user;

    res.status(200).json({
      message: "Profile fetched successfully",
      username,
      profile,
    });
  } catch (error) {
    console.error("Error fetching profile:", error.message, {
      userId: req.userId,
      stack: error.stack,
    });
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateUserProfile = async (req, res) => {
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

    const update = {
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
const newGroup = async (req, res) => {
  const userId = req.userId;
  const { groupData } = req.body;
  const { groupName, endLocation, meetupPoint, startTime } = groupData;

  const parsedEndLocation = parseCoordinates(endLocation);
  const parsedMeetupPoint = parseCoordinates(meetupPoint);

  const newGroup = new Group({
    name: groupName,
    startTime: new Date(startTime),
    members: [userId],
    routes: [
      {
        start: parsedMeetupPoint,
        end: parsedEndLocation,
      },
    ],
  });

  try {
    const result = await newGroup.save();
    res.json({ message: "Group created successfully", groupId: result._id });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Error creating group" });
  }
};

// getGroup
const getGroup = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const groups = await Group.find({ creator: userId }).populate(
      "members",
      "name profilePic"
    );

    res.json({ message: "Groups fetched successfully", groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Error fetching groups" });
  }
};

// Delete Group
const handleDelete = async (req, res) => {
  try {
    const groupId = new mongoose.Types.ObjectId(req.body.groupId);
    await Group.deleteOne({ _id: groupId });
    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ message: "Error deleting group" });
  }
};

router.post("/register", registerUser);
router.post("/login", loginUser);
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

module.exports = { router, connectToMongoDB, User };