const mongoose = require("mongoose");
const User = require("../routes/models/user");
require("dotenv").config();

const migrateUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DATABASE_NAME,
    });

    const result = await User.updateMany(
      { "profile.childName": { $exists: false } },
      {
        $set: {
          "profile.childName": "Not Specified",
          "profile.schoolName": "Not Specified",
        },
      }
    );

    console.log(`Successfully updated ${result.modifiedCount} users`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrateUsers();
