const jwt = require("jsonwebtoken");
const User = require("../../models/user");

module.exports = async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization token is missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.activeToken !== token) {
      return res
        .status(403)
        .json({ message: "Session expired. Please login again" });
    }

    req.userId = decoded.id;
    req.username = decoded.username;
    req.tier = decoded.tier;
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid token" });
  }
};
