const multer = require("multer");
const sharp = require("sharp");

const storage = multer.memoryStorage();
exports.upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"), false);
    }
  },
});

exports.processImage = async (buffer) => {
  return sharp(buffer).resize(200, 200).jpeg().toBuffer();
};
