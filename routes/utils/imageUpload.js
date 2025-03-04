import multer from "multer";
import { memoryStorage } from "multer";
import sharp from "sharp";

const storage = memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"), false);
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter,
});

export async function processImage(buffer, options = {}) {
  const { width = 200, height = 200, format = "jpeg", quality = 80 } = options;

  return sharp(buffer)
    .resize(width, height, {
      fit: "cover",
      position: "center",
    })
    .toFormat(format, { quality })
    .toBuffer();
}
export default upload;
