const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

const generateSchoolCredentials = async (req, res) => {
  console.log("Generating credentials for:", req.body.schoolName);

  const schoolId = `SCH-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
  const password = Math.random().toString(36).substring(2, 10);

  const hashedPassword = await bcrypt.hash(password, 10);

  const school = new School({
    schoolName: req.body.schoolName,
    schoolId,
    password: hashedPassword,
  });

  await school.save();

  const response = {
    schoolName: req.body.schoolName,
    schoolId,
    password,
  };

  console.log("Generated credentials:", response);
  return res.json(response);
};

router.post("/school/login", async (req, res) => {
  const { schoolId, password } = req.body;
  const school = await School.findOne({ schoolId });

  if (!school) return res.status(404).json({ message: "School not found" });

  const validPassword = await bcrypt.compare(password, school.password);
  if (!validPassword)
    return res.status(401).json({ message: "Invalid password" });

  const token = jwt.sign(
    { id: school._id, type: "school" },
    process.env.JWT_SECRET
  );

  res.json({ token, schoolName: school.schoolName });
});

router.post("/school/generate", generateSchoolCredentials);

module.exports = router;
