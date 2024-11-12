const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profile: {
      bio: { type: String, required: false },
      profilePic: {
        data: Buffer,
        contentType: String,
        required: false,
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
        routes: [
          {
            start: {
              latitude: {
                type: Number,
                required: true,
              },
              longitude: {
                type: Number,
                required: true,
              },
            },
            end: {
              latitude: {
                type: Number,
                required: true,
              },
              longitude: {
                type: Number,
                required: true,
              },
            },
            waypoints: [
              {
                latitude: Number,
                longitude: Number,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
