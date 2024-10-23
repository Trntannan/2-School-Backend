const express = require("express");
const { connectToMongoDB, router: userRouter } = require("./routes/user");
const cors = require("cors");
const fs = require("fs");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

connectToMongoDB()
  .then(() => {
    app.use("/api/user", userRouter);
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
  });
