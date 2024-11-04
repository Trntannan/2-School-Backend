const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profile: {
      school: String,
      kidCount: Number,
      bio: String,
      profilePic: {
        data: Buffer,
        contentType: String,
      },
    },
    group: {
      name: String,
      startTime: Date,
      creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      routes: [
        {
          start: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true },
          },
          end: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true },
          },
          waypoints: [
            {
              name: { type: String, required: true },
              latitude: { type: Number, required: true },
              longitude: { type: Number, required: true },
            },
          ],
          createdAt: { type: Date, default: Date.now },
        },
      ],
      createdAt: { type: Date, default: Date.now },
    },
  },
  {
    versionKey: false,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
