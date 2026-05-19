const rateLimit = require("express-rate-limit");
const RateLimitLog = require("../models/RateLimit");

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 10;

// --- express-rate-limit (in-memory, fast enforcement) ---
const limiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. You've hit the rate limit.",
    retryAfter: "15 minutes",
    limit: MAX_REQUESTS,
  },
  // Called on every request (hit or blocked)
  handler: async (req, res, next, options) => {
    const ip = req.ip;

    // Log the blocked request to MongoDB
    try {
      await RateLimitLog.findOneAndUpdate(
        { ip },
        {
          $set: { blocked: true, lastRequest: new Date() },
          $inc: { requestCount: 1 },
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("Rate limit log error:", err.message);
    }

    res.status(429).json(options.message);
  },
});

// --- MongoDB logger middleware (runs on every request, before limiter blocks) ---
const mongoRateLimitLogger = async (req, res, next) => {
  const ip = req.ip;
  const windowStart = new Date(Date.now() - WINDOW_MS);

  try {
    const log = await RateLimitLog.findOneAndUpdate(
      { ip, windowStart: { $gte: windowStart } },
      {
        $inc: { requestCount: 1 },
        $set: { lastRequest: new Date() },
        $setOnInsert: { windowStart: new Date() },
      },
      { upsert: true, new: true }
    );

    // Attach rate limit info to req for use in routes
    req.rateLimitInfo = {
      ip,
      requestCount: log.requestCount,
      remaining: Math.max(0, MAX_REQUESTS - log.requestCount),
      resetAt: new Date(log.windowStart.getTime() + WINDOW_MS),
    };
  } catch (err) {
    console.error("MongoDB rate log error:", err.message);
  }

  next();
};

module.exports = { limiter, mongoRateLimitLogger };
