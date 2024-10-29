const express = require("express");
const bcrypt = require("bcryptjs");
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
let groupsCollection;

const app = express();

app.use;
(req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
};

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
      console.log("Created 'users' collection in the database");
      await db.createCollection("groups");
      console.log("Created 'groups' collection in the database");
    }
    usersCollection = db.collection("users");
    groupsCollection = db.collection("groups");

    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
};

const generateToken = (userId) => {
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
  const { school, kidCount, bio } = req.body;
  try {
    const update = { profile: { school, kidCount, bio } };

    if (req.file) {
      update.profile.profilePic = {
        data: new Binary(req.file.buffer),
        contentType: req.file.mimetype,
      };
    }
    await usersCollection.updateOne({ _id: new ObjectId(req.userId) }, [
      { $set: update },
    ]);

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
};

const getUserProfile = async (req, res) => {
  console.log("url:", req.url);
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
  const { school, kidCount, bio, profilePic } = req.body;

  try {
    const update = { profile: { school, kidCount, bio, profilePic } };
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

const newGroup = async (req, res) => {
  const userId = req.userId;
  const { groupData } = req.body;
  const { groupName, schoolName, schoolLocation, meetupPoint, startTime } =
    groupData;
  const parsedSchoolLocation = parseCoordinates(schoolLocation);
  const parsedMeetupPoint = parseCoordinates(meetupPoint);

  const newGroup = {
    userId,
    groupName,
    schoolName,
    schoolLocation: parsedSchoolLocation,
    meetupPoint: parsedMeetupPoint,
    startTime,
  };

  try {
    await groupsCollection.insertOne(newGroup);

    res.json({ message: "Group created successfully", group: newGroup });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Error creating group" });
  }
};

const getGroup = async (req, res) => {
  try {
    const groups = await groupsCollection.find({}).toArray();
    res.json({ groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Error fetching groups" });
  }
};

function parseCoordinates(coordinates) {
  const [lat, long] = coordinates.split(",").map(number);
  return { lat, long };
}

const deleteAccount = async (req, res) => {
  try {
    await usersCollection.deleteOne({ _id: new ObjectId(req.userId) });
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Error deleting account" });
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
router.put(
  "/update-profile",
  authenticateToken,
  upload.single("profilePic"),
  updateUserProfile
);
router.get("/get-group", authenticateToken, getGroup);
router.post("/new-group", authenticateToken, newGroup);
router.delete("/delete-account", authenticateToken, deleteAccount);

module.exports = { router, connectToMongoDB };
