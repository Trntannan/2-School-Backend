const User = require("../../models/user");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");

class UserService {
  async findUserById(userId) {
    return await User.findById(userId);
  }

  async findUserByUsername(username) {
    return await User.findOne({ username });
  }

  async createUser(userData) {
    const newUser = new User(userData);
    return await newUser.save();
  }

  async updateUserProfile(userId, updateData) {
    return await User.findOneAndUpdate(
      { _id: userId },
      { $set: updateData },
      { new: true }
    );
  }

  async deleteUser(userId) {
    return await User.deleteOne({ _id: userId });
  }

  async getUserGroups(userId) {
    return await User.findById(userId).populate("groups");
  }

  async getAllGroups(excludeUserId) {
    const users = await User.find().lean();
    return users.reduce((allGroups, user) => {
      if (user._id.toString() !== excludeUserId && user.groups.length > 0) {
        allGroups.push(...user.groups);
      }
      return allGroups;
    }, []);
  }

  async addGroupToUser(userId, groupData) {
    const user = await this.findUserById(userId);
    user.groups.push(groupData);
    return await user.save();
  }

  async removeGroupFromUser(userId, groupId) {
    return await User.findOneAndUpdate(
      { _id: userId },
      { $pull: { groups: { _id: groupId } } },
      { new: true }
    );
  }

  async processJoinRequest(groupId, requestData) {
    return await User.updateOne(
      { "groups._id": groupId },
      {
        $push: {
          "groups.$.requests": requestData,
        },
      }
    );
  }

  async updateQrCode(userId, qrData) {
    const user = await this.findUserById(userId);
    user.qrCode = qrData;
    return await user.save();
  }

  async getGroupRequests(userId) {
    const user = await this.findUserById(userId);
    return user.groups.filter(
      (group) => group.requests && group.requests.length > 0
    );
  }

  async processRequestResponse(groupId, username, isAccepted, tier) {
    const updateOperation = isAccepted
      ? tier === "DIAMOND" || tier === "GOLD"
        ? {
            $pull: { "groups.$.requests": { username } },
            $push: { "groups.$.members": { username, tier } },
          }
        : {
            $set: { "groups.$.requests.$[request].status": "SCAN" },
          }
      : {
          $pull: { "groups.$.requests": { username } },
        };

    return await User.findOneAndUpdate(
      { "groups._id": groupId },
      updateOperation,
      {
        new: true,
        arrayFilters: [{ "request.username": username }],
      }
    );
  }

  async verifyMember(groupId, scannedUsername) {
    return await User.updateOne(
      { "groups._id": groupId },
      {
        $pull: { "groups.$.requests": { username: scannedUsername } },
        $push: {
          "groups.$.members": {
            username: scannedUsername,
            joinedAt: new Date(),
          },
        },
      }
    );
  }
}

module.exports = new UserService();
