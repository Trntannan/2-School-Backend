const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const User = require("../models/user");
const { MongoClient } = require("mongodb");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const mongoURI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME;

let db;

const connectToMongoDB = async () => {
  const client = new MongoClient(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log("Connected to MongoDB server");
    db = client.db(DATABASE_NAME);

    const collectionExists = await db
      .listCollections({ name: "users" })
      .hasNext();
    if (!collectionExists) {
      await db.createCollection("users");
      console.log("Created 'users' collection in the database");
    }
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "1h" });
};

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization token is missing" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
  }
};

const upload = multer();

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
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Error registering user" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Error logging in" });
  }
};

const completeUserProfile = async (req, res) => {
  const { fullName, school, kidCount, bio } = req.body;

  try {
    const update = { profile: { fullName, school, kidCount, bio } };

    if (req.file) {
      update.profile.profilePic = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const user = await User.findByIdAndUpdate(req.userId, update, {
      new: true,
    });
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

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ profile: user.profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

const updateUserProfile = async (req, res) => {
  const { fullName, school, kidCount, bio } = req.body;

  try {
    const update = { profile: { fullName, school, kidCount, bio } };
    const user = await User.findByIdAndUpdate(req.userId, update, {
      new: true,
    });

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

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post(
  "/complete-profile",
  authenticateToken,
  upload.single("profilePic"),
  completeUserProfile
);
router.get("/get-profile", authenticateToken, getUserProfile);
router.put("/update-profile", authenticateToken, updateUserProfile);

module.exports = { router, connectToMongoDB };
