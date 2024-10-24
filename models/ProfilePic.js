import mongoose from "mongoose";

const ProfilePicture = new mongoose.Schema({
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProfilePicture", ProfilePicture);
