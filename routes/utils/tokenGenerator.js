const jwt = require("jsonwebtoken");

exports.generateToken = (userId, username, tier) => {
  return jwt.sign(
    { id: userId.toString(), username, tier },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};
