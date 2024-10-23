const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const User = require("../models/user");
const { MongoClient, ObjectId, Binary } = require("mongodb");

require("dotenv").config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const mongoURI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME;

let usersCollection;

const connectToMongoDB = async () => {
  const client = new MongoClient(mongoURI);

  try {
    await client.connect();
    console.log("Connected to MongoDB server");
    db = client.db(DATABASE_NAME);

    const dbList = await client.db().admin().listDatabases();
    const databaseExists = dbList.databases.some(
      (db) => db.name === DATABASE_NAME
    );
    if (!databaseExists) {
      await db.createCollection("users");
    }
    usersCollection = db.collection("users");
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
};

const generateToken = (userId) => {
  if (!userId) {
    throw new Error("User ID is required for token generation");
  }
  return jwt.sign({ id: userId.toString() }, JWT_SECRET, { expiresIn: "1h" });
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
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, email, password: hashedPassword };

    const result = await usersCollection.insertOne(newUser);

    const token = generateToken(result.insertedId);

    res.status(201).json({ message: "User registered successfully", token });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ message: "Error registering user" });
  }
};

const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await usersCollection.findOne({ username });
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
        data: new Binary(req.file.buffer),
        contentType: req.file.mimetype,
      };
    }
    await usersCollection.updateOne(
      { _id: new ObjectId(req.userId) },
      { $set: update }
    );

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await usersCollection.findOne({
      _id: new ObjectId(req.userId),
    });

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
  const { fullName, school, kidCount, bio, profilePic } = req.body;

  try {
    const update = { profile: { fullName, school, kidCount, bio, profilePic } };
    const user = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(req.userId) },
      { $set: update }
    );

    if (!user.value) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      profile: user.value.profile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
};

const getGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const groups = await usersCollection.findOne({ _id: new ObjectId(userId) });

    res.status(200).json({ success: true, groups: groups.groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Error fetching groups" });
  }
};

const newGroup = async (req, res) => {
  try {
    const { groupData, userId } = req.body;

    const newGroup = new Group({
      ...groupData,
      meetupPoint: parseCoordinates(groupData.meetupPoint),
      schoolLocation: parseCoordinates(groupData.schoolLocation),
      userId,
    });

    await newGroup.save();

    res.status(201).json({ success: true, group: newGroup });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Error creating group" });
  }
};

function parseCoordinates(coordinates) {
  const [lat, long] = coords.split(",").map(number);
  return { lat, long };
}

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post(
  "/complete-profile",
  authenticateToken,
  upload.single("profilePic"),
  completeUserProfile
);
router.get("/get-profile", authenticateToken, getUserProfile);
router.put(
  "/update-profile",
  authenticateToken,
  upload.single("profilePic"),
  updateUserProfile
);
router.get("/get-groups", authenticateToken, getGroups);
router.post("/new-group", authenticateToken, newGroup);

module.exports = { router, connectToMongoDB };
