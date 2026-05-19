require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const Url = require("./models/Url");
const urlRoutes = require("./routes/url");

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, "../public")));

// ─── API Routes ────────────────────────────────────────────────
app.use("/api", urlRoutes);

// ─── Redirect Route ────────────────────────────────────────────
// GET /:code — resolve short code and redirect
app.get("/:code", async (req, res) => {
  const { code } = req.params;

  // Ignore favicon and other browser auto-requests
  if (code === "favicon.ico") return res.sendStatus(404);

  try {
    const url = await Url.findOneAndUpdate(
      { shortCode: code },
      {
        $inc: { clicks: 1 },
        $set: { lastAccessed: new Date() },
      },
      { new: true }
    );

    if (!url) {
      return res.status(404).sendFile(path.join(__dirname, "../public/index.html"));
    }

    // 301 permanent redirect
    return res.redirect(301, url.originalUrl);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Root Route ────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ─── MongoDB + Server Start ────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running at ${BASE_URL}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
