const mongoose = require("mongoose");

const tierImageSchema = new mongoose.Schema({
  tier: {
    type: String,
    required: true,
    enum: ["BRONZE", "SILVER", "GOLD", "DIAMOND"],
  },
  image: {
    data: Buffer,
    contentType: String,
  },
});

module.exports = mongoose.model("TierImage", tierImageSchema);
