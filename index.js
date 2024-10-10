const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

app.use(express.json());

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

const verifyJWT = (req, res, next) => {
  const token = req.session.token;
  if (!token) {
    return res.status(403).send("Token missing");
  }

  jwt.verify(token, "your_jwt_secret", (err, decoded) => {
    if (err) {
      return res.status(401).send("Unauthorized");
    }
    req.userId = decoded.id;
    next();
  });
};

// Example route
app.get("/api/protected", verifyJWT, (req, res) => {
  res.send(`Hello user with ID: ${req.userId}`);
});

const userRoutes = require("./routes/user");
app.use("/api/users", userRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
