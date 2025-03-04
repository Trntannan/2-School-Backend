const cors = require("cors");

const corsOptions = {
  origin: ["https://two-school-front.onrender.com/", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

module.exports = cors(corsOptions);
