const express = require("express");
const fs = require("fs");
const router = express.Router();

const dbPath = "./db.json";

router.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  let rawData = fs.readFileSync(dbPath);
  let db = JSON.parse(rawData);

  if (db.users.some((user) => user.email === email)) {
    return res.status(400).json({ message: "User already exists" });
  }

  const newUser = { id: Date.now(), username, email, password };
  db.users.push(newUser);

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));


  res.status(201).json({ message: "User created successfully", user: newUser });
});

module.exports = router;
