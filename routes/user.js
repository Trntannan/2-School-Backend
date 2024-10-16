const express = require("express");
const fs = require("fs");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const dbPath = "./db.json";

router.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  let rawData = fs.readFileSync(dbPath);
  let db = JSON.parse(rawData);

  if (db.users.some((user) => user.email === email)) {
    return res.status(400).json({ message: "User already exists" });
  }

  const userId = crypto.randomBytes(16).toString("hex");
  // const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    userId,
    username,
    email,
    password,
    profile: {
      fullName: "",
      kidCount: 0,
      school: "",
      bio: "",
    },
  };

  db.users.push(newUser);

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  res.status(201).json({ message: "User created successfully", user: newUser });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  let rawData = fs.readFileSync(dbPath);
  let db = JSON.parse(rawData);

  const user = db.users.find((user) => user.username === username);
  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.status(200).json({ message: "Login successful", user });
});

module.exports = router;
