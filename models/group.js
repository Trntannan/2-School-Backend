const mongoose = require("mongoose");

const group = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startTime: { type: Date },
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
  {
    versionKey: false,
  }
);

const Group = mongoose.model("Group", group);

module.exports = Group;
