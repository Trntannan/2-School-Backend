const express = require("express");
const router = express.Router();
const multer = require("multer");
const sharp = require("sharp");
const TierImage = require("../models/tierImage");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get all tier images
router.get("/all", async (req, res) => {
  try {
    const tierImages = await TierImage.find({});
    const formattedImages = {};

    tierImages.forEach((tierImage) => {
      formattedImages[tierImage.tier.toLowerCase()] =
        tierImage.image.data.toString("base64");
    });

    res.json({ tierImages: formattedImages });
  } catch (error) {
    res.status(500).json({ message: "Error fetching tier images" });
  }
});

// Upload tier image with authentication
router.post(
  "/upload",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image provided" });
      }

      const { tier } = req.body;
      const imageBuffer = await sharp(req.file.buffer)
        .resize(55, 47)
        .png()
        .toBuffer();

      await TierImage.findOneAndUpdate(
        { tier: tier.toUpperCase() },
        {
          image: {
            data: imageBuffer,
            contentType: "image/png",
          },
        },
        { upsert: true }
      );

      res.json({ message: "Tier image uploaded successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error uploading tier image" });
    }
  }
);

module.exports = router;
