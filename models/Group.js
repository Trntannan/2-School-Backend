const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  groupName: { type: String, required: true },
  schoolName: { type: String, required: true },
  meetupPoint: { lat: Number, lng: Number },
  schoolLocation: { lat: Number, lng: Number },
  startTime: { type: String, required: true },
  status: { type: String, default: "active" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

module.exports = mongoose.model("Group", groupSchema);
