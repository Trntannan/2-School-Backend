const User = require("../models/user");
const { generateToken } = require("../utils/tokenGenerator");
const bcrypt = require("bcryptjs");

exports.registerUser = async (req, res) => {
  const user = new User(req.body);
  await user.save();
  res.status(201).json(user);
};

exports.getUserProfile = async (req, res) => {
  const user = await User.findById(req.params.userId);
  res.json(user);
};

exports.updateUserProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, req.body, {
    new: true,
  });
  res.json(user);
};

exports.createGroup = async (req, res) => {
  const user = await User.findById(req.params.userId);
  user.groups.push(req.body);
  await user.save();
  res.status(201).json(req.body);
};

exports.deleteGroup = async (req, res) => {
  const user = await User.findById(req.params.userId);
  user.groups = user.groups.filter(
    (group) => group._id.toString() !== req.params.groupId
  );
  await user.save();
  res.json(user.groups);
};
