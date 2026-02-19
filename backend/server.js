/**
 * server.js
 * EvidenceChain Backend — Express API Server
 */

require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");
const path       = require("path");

const { initBlockchain } = require("./utils/blockchain");
const evidenceRoutes     = require("./routes/evidence");

const app  = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
//  Security Middleware
// ─────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin:      process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      100,
  message:  "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// ─────────────────────────────────────────────
//  General Middleware
// ─────────────────────────────────────────────

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (restrict in production)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─────────────────────────────────────────────
//  Routes
// ─────────────────────────────────────────────

app.use("/api/evidence", evidenceRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status:    "OK",
    service:   "EvidenceChain API",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// ─────────────────────────────────────────────
//  Start Server
// ─────────────────────────────────────────────

async function start() {
  try {
    await initBlockchain();
    app.listen(PORT, () => {
      console.log("\n╔══════════════════════════════════════╗");
      console.log("║     EvidenceChain API Server         ║");
      console.log(`║     Running on port ${PORT}             ║`);
      console.log("╚══════════════════════════════════════╝\n");
    });
  } catch (err) {
    console.error("\n❌ Failed to start server:", err.message);
    console.error("   → Make sure Ganache is running and .env is configured\n");
    process.exit(1);
  }
}

start();
