const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema({
  schoolName: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isFirstLogin: { type: Boolean, default: true },
  pendingVerifications: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      username: String,
      childName: String,
      requestDate: Date,
    },
  ],
  verifiedUsers: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      username: String,
      verificationDate: Date,
    },
  ],
  deniedUsers: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      username: String,
      denialReason: String,
      requiresInPerson: Boolean,
    },
  ],
});
