const User = require("../models/user");
const { generateToken } = require("../utils/tokenGenerator");
const bcrypt = require("bcryptjs");

exports.registerUser = async (req, res) => {
  const user = new User(req.body);
  await user.save();
  res.status(201).json(user);
};

exports.loginUser = async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  res.json({ token: generateToken(user._id) });
};

exports.completeProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, req.body, {
    new: true,
  });
  res.json(user);
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

exports.deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.userId);
  res.json(user);
};

exports.createGroup = async (req, res) => {
  const user = await User.findById(req.params.userId);
  user.groups.push(req.body);
  await user.save();
  res.status(201).json(req.body);
};

exports.getGroup = async (req, res) => {
  const user = await User.findById(req.params.userId);
  const group = user.groups.find(
    (group) => group._id.toString() === req.params.groupId
  );
  res.json(group);
};

exports.deleteGroup = async (req, res) => {
  const user = await User.findById(req.params.userId);
  user.groups = user.groups.filter(
    (group) => group._id.toString() !== req.params.groupId
  );
  await user.save();
  res.json(user.groups);
};

exports.updateGroup = async (req, res) => {
  const user = await User.findById(req.params.userId);
  const group = user.groups.find(
    (group) => group._id.toString() === req.params.groupId
  );
  group.name = req.body.name;
  group.startTime = req.body.startTime;
  group.routes = req.body.routes;
  await user.save();
  res.json(group);
};
