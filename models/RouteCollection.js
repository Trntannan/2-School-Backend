import mongoose from "mongoose";

const RouteSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
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
});

module.exports = mongoose.model("Route", RouteSchema);
