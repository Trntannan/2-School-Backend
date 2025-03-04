const User = require("../../models/user");
const bcrypt = require("bcryptjs");

const initializeCollections = async () => {
  try {
    const userExists = await User.findOne();
    if (!userExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await new User({
        username: "admin",
        email: "admin@example.com",
        password: hashedPassword,
        tier: "DIAMOND",
        profile: {
          bio: "System Administrator",
          profilePic: {},
        },
        groups: [],
      }).save();
      console.log("Initial admin user created successfully");
    }
  } catch (error) {
    console.error("Error initializing collections:", error);
    process.exit(1);
  }
};

module.exports = initializeCollections;
