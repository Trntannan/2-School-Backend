const express = require("express");
const cors = require("cors");
const connectToMongoDB = require("./utils/dbConnection");
const userRouter = require("./routes/user");

require("dotenv").config();

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

connectToMongoDB()
  .then(() => {
    console.log("Connected to MongoDB");
    app.use("/api/user", userRouter);
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => console.error("Failed to connect to MongoDB:", error));
