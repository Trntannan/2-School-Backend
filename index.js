const express = require("express");
const { router: userRouter, connectToMongoDB } = require("./routes/user");

const cors = require("cors");

require("dotenv").config();

const schoolRouter = require("./routes/school");

const PORT = process.env.PORT || 5000;
const app = express();
// app.set("trust proxy", 1);
// app.get("/ip", (request, response) => response.send(request.ip));
app.use("/", schoolRouter);
app.use(cors());
app.use(express.json());

connectToMongoDB()
  .then(() => {
    console.log("Connected to MongoDB");
    app.use("/api/user", userRouter);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
  });
