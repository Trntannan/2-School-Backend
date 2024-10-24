const mongoose = require("mongoose");

const UserCollection = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profile: {
    fullName: { type: String },
    numberOfKids: { type: String },
    school: { type: String },
    bio: { type: String },
  },
  profilePic: { type: mongoose.Schema.Types.ObjectId, ref: "ProfilePicture" },
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
});

module.exports = mongoose.model("User", UserCollection);
