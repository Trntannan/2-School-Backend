const mongoose = require("mongoose");
const initializeCollections = require("./initializeCollections");

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DATABASE_NAME,
    });
    console.log(`Connected to MongoDB database: ${process.env.DATABASE_NAME}`);

    const migrateExistingGroups = async () => {
      const users = await User.find({});
      for (const user of users) {
        for (const group of user.groups) {
          if (!group.owner) {
            group.owner = user._id;
          }
        }
        await user.save();
      }
    };

    await migrateExistingGroups();
    await initializeCollections();
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

module.exports = connectToMongoDB;
