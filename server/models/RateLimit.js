const mongoose = require("mongoose");

// Custom schema to log rate limit hits in MongoDB (good for resume demo!)
const RateLimitLogSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    default: "/api/shorten",
  },
  requestCount: {
    type: Number,
    default: 1,
  },
  windowStart: {
    type: Date,
    default: Date.now,
  },
  blocked: {
    type: Boolean,
    default: false,
  },
  lastRequest: {
    type: Date,
    default: Date.now,
  },
});

// TTL index: auto-delete documents after 15 minutes (matches rate limit window)
RateLimitLogSchema.index({ windowStart: 1 }, { expireAfterSeconds: 900 });

module.exports = mongoose.model("RateLimitLog", RateLimitLogSchema);
