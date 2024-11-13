const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: String,
  creator: String,
  members: [String],
  startTime: Date,
  routes: [
    {
      start: {
        latitude: String,
        longitude: String,
      },
      end: {
        latitude: String,
        longitude: String,
      },
      waypoints: [
        {
          latitude: String,
          longitude: String,
        },
      ],
    },
  ],
});

const Group = mongoose.model("Group", groupSchema);
module.exports = Group;
