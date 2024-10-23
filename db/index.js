const { MongoClient } = require("mongodb");
require("dotenv").config();

const mongoURI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME;

let usersCollection;

const connectToMongoDB = async () => {
  const client = new MongoClient(mongoURI);

  try {
    await client.connect();
    console.log("Connected to MongoDB server");

    const db = client.db(DATABASE_NAME);
    const dbList = await client.db().admin().listDatabases();

    const databaseExists = dbList.databases.some(
      (db) => db.name === DATABASE_NAME
    );

    if (!databaseExists) {
      await db.createCollection("users");
      console.log("Created 'users' collection in the database");
    }

    usersCollection = db.collection("users");
    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

const getUsersCollection = () => usersCollection;

module.exports = { connectToMongoDB, getUsersCollection };
