const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    tier: {
      type: String,
      enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
      default: "BRONZE",
    },
    groups: [
      {
        name: {
          type: String,
          required: true,
        },
        startTime: {
          type: Date,
          required: true,
        },
        members: [
          {
            userId: {
              type: String,
              required: true,
            },
          },
        ],
        requests: [
          {
            userId: {
              type: String,
              required: true,
            },
          },
        ],
        routes: [
          {
            start: {
              latitude: {
                type: String,
                required: true,
              },
              longitude: {
                type: String,
                required: true,
              },
            },
            end: {
              latitude: {
                type: String,
                required: true,
              },
              longitude: {
                type: String,
                required: true,
              },
            },
            waypoints: [
              {
                latitude: String,
                longitude: String,
              },
            ],
          },
        ],
      },
    ],
    profile: {
      bio: { type: String, required: false },
      profilePic: {
        data: Buffer,
        contentType: String,
      },
    },
    qrCode: {
      data: Buffer,
      contentType: String,
      lastVerified: Date,
      verifiedBy: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
