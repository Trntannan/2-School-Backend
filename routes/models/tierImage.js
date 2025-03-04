const mongoose = require("mongoose");

const tierImageSchema = new mongoose.Schema({
  tier: {
    type: String,
    required: true,
    enum: ["BRONZE", "SILVER", "GOLD", "DIAMOND"],
    unique: true,
  },
  image: {
    data: Buffer,
    contentType: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("TierImage", tierImageSchema);
