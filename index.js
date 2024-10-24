const express = require("express");
const { connectToMongoDB, router: userRouter } = require("./routes/user");
const cors = require("cors");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

connectToMongoDB()
  .then(() => {
    console.log("Connected to MongoDB");
    app.use("/api/user", userRouter);
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
  });
