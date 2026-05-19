const mongoose = require("mongoose");

const UrlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: true,
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    lastAccessed: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: String, // stores IP address
      default: "anonymous",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Url", UrlSchema);
