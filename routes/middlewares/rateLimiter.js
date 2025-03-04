const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many login attempts",
      remainingTime: req.rateLimit.resetTime - Date.now(),
    });
  },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many requests from this IP",
  standardHeaders: true,
});

module.exports = { loginLimiter, apiLimiter };
