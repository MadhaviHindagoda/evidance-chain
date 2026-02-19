/**
 * routes/evidence.js
 * Evidence upload, retrieval, and management endpoints
 */

const express  = require("express");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const { v4: uuidv4 } = require("uuid");

const { hashFile, formatFileSize } = require("../utils/fileHash");
const blockchain = require("../utils/blockchain");

const router = express.Router();

// ─────────────────────────────────────────────
//  Multer Configuration
// ─────────────────────────────────────────────

const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024 },
});

// ─────────────────────────────────────────────
//  POST /api/evidence/upload
//  Upload a new file and register its hash on-chain
// ─────────────────────────────────────────────

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  try {
    const filePath    = req.file.path;
    const fileHash    = hashFile(filePath);
    const { fileName, fileType, fileSize, description, caseId, uploaderAddress, ipfsHash } = req.body;

    // Check for duplicate
    const existing = await blockchain.verifyEvidence(fileHash);
    if (existing.isValid) {
      fs.unlinkSync(filePath); // remove duplicate upload
      return res.status(409).json({
        success: false,
        error:   "This file has already been registered on the blockchain.",
        evidenceId: existing.evidenceId,
      });
    }

    // Register on blockchain
    const { evidenceId, transactionHash } = await blockchain.addEvidence({
      fileHash,
      ipfsHash:        ipfsHash || "",
      fileName:        fileName || req.file.originalname,
      fileType:        fileType || req.file.mimetype,
      fileSize:        fileSize || req.file.size,
      description:     description || "",
      caseId:          caseId || "",
      uploaderAddress: uploaderAddress || null,
    });

    return res.status(201).json({
      success: true,
      message: "Evidence registered on blockchain successfully",
      data: {
        evidenceId,
        fileHash,
        transactionHash,
        fileName:        fileName || req.file.originalname,
        fileSize:        formatFileSize(req.file.size),
        uploadedAt:      new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
//  POST /api/evidence/verify
//  Verify a file against the blockchain
// ─────────────────────────────────────────────

router.post("/verify", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  try {
    const filePath = req.file.path;
    const fileHash = hashFile(filePath);

    // Remove temp file immediately
    fs.unlinkSync(filePath);

    const result = await blockchain.verifyEvidence(fileHash);

    if (!result.isValid) {
      return res.json({
        success:   true,
        isValid:   false,
        fileHash,
        message:   "File NOT found on blockchain — may be tampered or unregistered",
      });
    }

    // Fetch full evidence details
    const evidence = await blockchain.getEvidenceByHash(fileHash);
    const auditLogs = await blockchain.getAuditLogs(result.evidenceId);

    return res.json({
      success:   true,
      isValid:   true,
      fileHash,
      message:   "File integrity VERIFIED — hash matches blockchain record",
      evidence,
      auditLogs,
    });
  } catch (err) {
    console.error("Verify error:", err);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/evidence/all
//  Get all evidence records
// ─────────────────────────────────────────────

router.get("/all", async (req, res) => {
  try {
    const ids      = await blockchain.getAllEvidenceIds();
    const evidence = await Promise.all(
      ids.map(id => blockchain.getEvidence(id).then(e => ({ ...e, evidenceId: id })))
    );
    return res.json({ success: true, count: evidence.length, data: evidence.reverse() });
  } catch (err) {
    console.error("Get all error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/evidence/:evidenceId
//  Get a single evidence record
// ─────────────────────────────────────────────

router.get("/:evidenceId", async (req, res) => {
  try {
    const evidence  = await blockchain.getEvidence(req.params.evidenceId);
    const auditLogs = await blockchain.getAuditLogs(req.params.evidenceId);
    return res.json({ success: true, data: { ...evidence, auditLogs } });
  } catch (err) {
    return res.status(404).json({ success: false, error: "Evidence not found" });
  }
});

// ─────────────────────────────────────────────
//  POST /api/evidence/:evidenceId/seal
//  Seal evidence (make immutable)
// ─────────────────────────────────────────────

router.post("/:evidenceId/seal", async (req, res) => {
  try {
    const { fromAddress } = req.body;
    await blockchain.sealEvidence(req.params.evidenceId, fromAddress);
    return res.json({ success: true, message: "Evidence sealed successfully" });
  } catch (err) {
    console.error("Seal error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/evidence/stats/overview
//  Dashboard statistics
// ─────────────────────────────────────────────

router.get("/stats/overview", async (req, res) => {
  try {
    const count = await blockchain.getEvidenceCount();
    const ids   = await blockchain.getAllEvidenceIds();
    const all   = await Promise.all(ids.map(id => blockchain.getEvidence(id)));

    const stats = {
      total:      count,
      active:     all.filter(e => e.status === "Active").length,
      sealed:     all.filter(e => e.isSealed).length,
      disputed:   all.filter(e => e.status === "Disputed").length,
    };

    return res.json({ success: true, data: stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
