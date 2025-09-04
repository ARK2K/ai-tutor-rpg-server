require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const { requireClerkAuth } = require("./middleware/clerkAuth");

// Route imports
const questRoutes = require("./routes/quests");
const llmRoutes = require("./routes/llmProxy");

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------
app.use(helmet()); // security headers
app.use(cors({ origin: "*", credentials: true })); // allow all origins for dev
app.use(morgan("dev")); // request logging
app.use(compression()); // gzip
app.use(express.json({ limit: "1mb" })); // JSON body parser

// ---------- Rate limiter (per IP) ----------
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 60, // limit each IP to 60 requests/minute
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// ---------- Routes ----------
app.get("/", (req, res) => {
  res.json({ status: "AI Tutor RPG backend running" });
});

// Clerk-protected routes
app.use("/api/quests", requireClerkAuth, questRoutes);

// LLM proxy (server-side only)
app.use("/api/llm", requireClerkAuth, llmRoutes);

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// ---------- Start server ----------
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});