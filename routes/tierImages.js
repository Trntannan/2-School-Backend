const express = require("express");
const router = express.Router();
const multer = require("multer");
const sharp = require("sharp");
const TierImage = require("../models/tierImage");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload tier image
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { tier } = req.body;
    const processedImage = await sharp(req.file.buffer).png().toBuffer();

    const tierImage = new TierImage({
      tier,
      image: {
        data: processedImage,
        contentType: "image/png",
      },
    });

    await tierImage.save();
    res.status(201).json({ message: "Tier image uploaded successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error uploading tier image" });
  }
});

// Get tier image
router.get("/:tier", async (req, res) => {
  try {
    const tierImage = await TierImage.findOne({ tier: req.params.tier });
    if (!tierImage) {
      return res.status(404).json({ message: "Tier image not found" });
    }

    const imageData = `data:${
      tierImage.image.contentType
    };base64,${tierImage.image.data.toString("base64")}`;
    res.json({ imageUrl: imageData });
  } catch (error) {
    res.status(500).json({ message: "Error fetching tier image" });
  }
});

module.exports = router;
