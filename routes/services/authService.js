const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/tokenGenerator");

class AuthService {
  async validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async checkExistingUser(email, username) {
    const [existingEmail, existingUsername] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ username }),
    ]);
    return { existingEmail, existingUsername };
  }

  async generateUsernameVariation(username) {
    let counter = 1;
    let suggestedUsername = username;
    let isAvailable = false;

    while (!isAvailable && counter < 100) {
      const suggestion = `${username}${counter}`;
      const exists = await User.findOne({ username: suggestion });
      if (!exists) {
        suggestedUsername = suggestion;
        isAvailable = true;
      }
      counter++;
    }
    return suggestedUsername;
  }

  async register(userData) {
    const newUser = new User(userData);
    await newUser.save();
    const token = generateToken(newUser._id);
    newUser.activeToken = token;
    await newUser.save();
    return { newUser, token };
  }

  async login(username, password) {
    const user = await User.findOne({ username });
    if (!user) return null;

    if (user.loginAttempts >= 5) {
      const lastAttempt = user.lastLoginAttempt || new Date(0);
      const lockoutDuration = 15 * 60 * 1000;
      if (Date.now() - lastAttempt < lockoutDuration) {
        return {
          locked: true,
          remainingTime: lockoutDuration - (Date.now() - lastAttempt),
        };
      }
      user.loginAttempts = 0;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      user.loginAttempts += 1;
      user.lastLoginAttempt = new Date();
      await user.save();
      return { failed: true, attemptsRemaining: 5 - user.loginAttempts };
    }

    user.loginAttempts = 0;
    const token = generateToken(user._id);
    user.activeToken = token;
    await user.save();

    return { user, token };
  }

  async logout(userId) {
    const user = await User.findById(userId);
    user.activeToken = null;
    return await user.save();
  }
}

module.exports = new AuthService();
