const express = require("express");
const router = express.Router();
const validUrl = require("valid-url");
const { nanoid } = require("nanoid");

const Url = require("../models/Url");
const { limiter, mongoRateLimitLogger } = require("../middleware/rateLimiter");

// POST /api/shorten — create a shortened URL
// Apply: MongoDB logger first, then express-rate-limit enforcer
router.post("/shorten", mongoRateLimitLogger, limiter, async (req, res) => {
  const { originalUrl, customSlug } = req.body;

  // 1. Validate URL
  if (!originalUrl || !validUrl.isUri(originalUrl)) {
    return res.status(400).json({
      success: false,
      error: "Please provide a valid URL (include http:// or https://)",
    });
  }

  // 2. Validate custom slug if provided
  if (customSlug) {
    const slugRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!slugRegex.test(customSlug)) {
      return res.status(400).json({
        success: false,
        error: "Custom slug must be 3–20 characters (letters, numbers, - or _)",
      });
    }
    const exists = await Url.findOne({ shortCode: customSlug });
    if (exists) {
      return res.status(409).json({
        success: false,
        error: "That custom slug is already taken. Try another.",
      });
    }
  }

  try {
    // 3. Check if URL was already shortened (dedup)
    const existing = await Url.findOne({ originalUrl });
    if (existing && !customSlug) {
      return res.status(200).json({
        success: true,
        shortUrl: `${process.env.BASE_URL}/${existing.shortCode}`,
        shortCode: existing.shortCode,
        originalUrl: existing.originalUrl,
        clicks: existing.clicks,
        createdAt: existing.createdAt,
        rateLimitInfo: req.rateLimitInfo,
        cached: true,
      });
    }

    // 4. Generate short code
    const shortCode = customSlug || nanoid(7);

    // 5. Save to MongoDB
    const url = new Url({
      originalUrl,
      shortCode,
      createdBy: req.ip,
    });
    await url.save();

    return res.status(201).json({
      success: true,
      shortUrl: `${process.env.BASE_URL}/${shortCode}`,
      shortCode,
      originalUrl,
      clicks: 0,
      createdAt: url.createdAt,
      rateLimitInfo: req.rateLimitInfo,
      cached: false,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/stats/:code — get analytics for a short URL
router.get("/stats/:code", async (req, res) => {
  try {
    const url = await Url.findOne({ shortCode: req.params.code });
    if (!url) {
      return res.status(404).json({ success: false, error: "Short URL not found" });
    }
    res.json({
      success: true,
      shortCode: url.shortCode,
      shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
      originalUrl: url.originalUrl,
      clicks: url.clicks,
      lastAccessed: url.lastAccessed,
      createdAt: url.createdAt,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /api/urls — list all shortened URLs (paginated)
router.get("/urls", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const urls = await Url.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("shortCode originalUrl clicks createdAt lastAccessed");

    const total = await Url.countDocuments();

    res.json({
      success: true,
      urls: urls.map((u) => ({
        ...u.toObject(),
        shortUrl: `${process.env.BASE_URL}/${u.shortCode}`,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// DELETE /api/urls/all — delete all URLs
router.delete('/urls/all', async (req, res) => {
  try {
    await Url.deleteMany({});
    res.json({ success: true, message: 'All URLs deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
