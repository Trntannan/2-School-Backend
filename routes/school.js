const express = require("express");
const router = express.Router();
const School = require("./models/school");
const User = require("./models/user");

router.post("/first-login-password-change", async (req, res) => {
  const { newPassword, schoolId } = req.body;
  const school = await School.findById(schoolId);
  school.password = await bcrypt.hash(newPassword, 10);
  school.isFirstLogin = false;
  await school.save();
  res.status(200).json({ message: "Password updated successfully" });
});

router.post("/verify-user", async (req, res) => {
  const { userId } = req.body;
  const school = await School.findById(req.schoolId);
  const user = await User.findById(userId);

  user.tier = "GOLD";
  await user.save();

  // Update school's verification lists
  await School.updateOne(
    { _id: req.schoolId },
    {
      $pull: { pendingVerifications: { userId } },
      $push: {
        verifiedUsers: {
          userId,
          username: user.username,
          verificationDate: new Date(),
        },
      },
    }
  );

  res.status(200).json({ message: "User verified successfully" });
});
