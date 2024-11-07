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
    groups: [
      {
        name: { type: String, required: true },
        startTime: { type: Date, required: true },
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
                name: { type: String },
                latitude: { type: Number },
                longitude: { type: Number },
              },
            ],
            createdAt: { type: Date, default: Date.now },
          },
        ],
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    versionKey: false,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
