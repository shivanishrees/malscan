import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "crypto";
import axios from "axios";
import FormData from "form-data";

import orchestrator from "./core/orchestrator.js";
import analysisStore from "./storage/analysisStore.js";
import { moduleRegistry } from "./modules/moduleInterface.js";
import { registerMockModules } from "./modules/mockModules.js";
import reconstructionEngine from "./modules/static_file_analysis/reconstruction.js";


const app = express();
const PORT = process.env.PORT || 3001;

/* -------------------- Middleware -------------------- */
app.use(cors());
app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

/* -------------------- Multer config -------------------- */
// Memory-based upload (secure, no execution, no disk write)
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

app.post("/api/reconstruct", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const result = await reconstructionEngine.process(req.file);

    res.status(200).json({
      success: true,
      result
    });

  } catch (err) {
    console.error("Reconstruction error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* -------------------- FILE UPLOAD + SHA -------------------- */
/**
 * POST /api/upload
 * Upload file → generate MD5 & SHA-256 → deduplicate → analyze
 */
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const buffer = req.file.buffer;

    // REAL HASH GENERATION (from file bytes)
    const md5 = crypto.createHash("md5").update(buffer).digest("hex");
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    /* -------- DUPLICATE CHECK (SHA-256) -------- */
    for (const [id, analysis] of analysisStore.activeAnalyses) {
      if (analysis.file_reference?.file_hash === sha256) {
        return res.status(200).json({
          success: true,
          reused: true,
          analysis_id: id,
          md5,
          sha256,
          message: "File already analyzed. Existing result reused."
        });
      }
    }

    /* -------- START NEW ANALYSIS -------- */
    const result = await orchestrator.initiateAnalysis({
      file_hash: sha256,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: req.file.mimetype,
      metadata: { md5, sha256 }
    });

    return res.status(202).json({
      success: true,
      reused: false,
      analysis_id: result.analysis_id,
      md5,
      sha256
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* -------------------- ANALYSIS API -------------------- */
/**
 * POST /api/analyze
 * Metadata-only analysis (used by frontend mock)
 */
app.post("/api/analyze", async (req, res) => {
  try {
    const { file_hash, file_name, file_size, file_type, metadata } = req.body;

    const validation = orchestrator.validateAnalysisRequest({
      file_hash,
      file_name,
      file_size,
      file_type
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const result = await orchestrator.initiateAnalysis({
      file_hash,
      file_name,
      file_size,
      file_type,
      metadata
    });

    res.status(202).json(result);

  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/* -------------------- STATUS API -------------------- */
app.get("/api/status/:analysis_id", async (req, res) => {
  try {
    const result = await orchestrator.getAnalysisStatus(req.params.analysis_id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve analysis status"
    });
  }
});

/* -------------------- STATS & HEALTH -------------------- */
app.get("/api/stats", (req, res) => {
  res.json({
    success: true,
    stats: orchestrator.getStats()
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/* -------------------- SERVER START -------------------- */
async function startServer() {
  console.log("🚀 Initializing MalScan Backend...");

  // Register modules (your static_analysis is already plugged in)
  registerMockModules(moduleRegistry);

  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📦 Registered modules: ${moduleRegistry.getModuleNames().join(", ")}`);
    console.log("🔒 Zero Trust: all files untrusted by default");
  });

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function shutdown() {
  console.log("\n🛑 Shutting down...");
  await analysisStore.shutdown();
  process.exit(0);
}

startServer();
