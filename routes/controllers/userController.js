const { mongo, default: mongoose } = require("mongoose");
const User = require("../models/user");
const { generateToken } = require("../utils/tokenGenerator");
const bcrypt = require("bcryptjs");
const ObjectId = require("mongodb").ObjectId;

exports.registerUser = async (req, res) => {
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

exports.loginUser = async (req, res) => {
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

exports.updateUserProfile = async (req, res) => {
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

exports.getUserProfile = async (req, res) => {
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

exports.getGroup = async (req, res) => {
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

exports.completeUserProfile = async (req, res) => {
  const { bio } = req.body;
  let profilePic = null;

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
};

exports.getAllGroups = async (req, res) => {
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

exports.newGroup = async (req, res) => {
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

exports.deleteGroup = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    console.log("User found:", user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingGroup = user.groups.find((group) =>
      group._id.equals(mongoose.Types.ObjectId(req.params.groupId))
    );
    console.log("Existing group:", existingGroup);

    if (!existingGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    console.log("Removing group from user's groups array...");
    user.groups = user.groups.filter(
      (group) => !group._id.equals(mongoose.Types.ObjectId(req.params.groupId))
    );
    console.log("Updated user groups:", user.groups);

    console.log("Saving updated user document...");
    await user.save();
    console.log("User document saved successfully");

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ message: "Failed to delete group" });
  }
};
