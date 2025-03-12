const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    tier: {
      type: String,
      enum: ["BRONZE", "SILVER", "GOLD", "DIAMOND"],
      default: "BRONZE",
    },
    profile: {
      childName: { type: String, required: false },
      schoolName: { type: String, required: false },
      bio: { type: String, required: false },
      profilePic: {
        data: Buffer,
        contentType: String,
      },
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
        owner: {
          type: String,
          required: true,
        },
        members: [
          {
            username: {
              type: String,
              required: true,
            },
            userId: String,
          },
        ],
        requests: [
          {
            username: {
              type: String,
              required: true,
            },
            userId: {
              type: String,
              required: true,
            },
            status: {
              type: String,
              enum: ["PENDING", "SCAN"],
              default: "PENDING",
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
    qrCode: {
      data: Buffer,
      contentType: String,
      lastVerified: Date,
      verifiedBy: String,
    },
    activeToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
