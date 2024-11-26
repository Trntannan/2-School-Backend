const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profile: {
      bio: { type: String, required: false },
      profilePic: {
        data: Buffer,
        contentType: String,
      },
    },
    groups: {
      name: {
        type: String,
        required: false,
      },
      startTime: {
        type: Date,
        required: false,
      },
      routes: [
        {
          start: {
            latitude: {
              type: String,
              required: false,
            },
            longitude: {
              type: String,
              required: false,
            },
          },
          end: {
            latitude: {
              type: String,
              required: false,
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
