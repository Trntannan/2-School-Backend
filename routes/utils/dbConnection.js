const mongoose = require("mongoose");
require("dotenv").config();

const mongoURI = process.env.MONGODB_URI;
const dbName = process.env.DATABASE_NAME;

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      dbName,
    });
    console.log(`Connected to MongoDB database: ${dbName}`);
    await initializeCollections();
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

module.exports = connectToMongoDB;
