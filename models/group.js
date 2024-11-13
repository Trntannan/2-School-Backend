const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    startTime: {
      type: Date,
      required: true,
    },
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
  {
    timestamps: true,
    versionKey: false,
  }
);

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
