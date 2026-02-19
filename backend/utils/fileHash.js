/**
 * fileHash.js
 * Utility to generate SHA-256 hash of a file buffer
 */

const crypto = require("crypto");
const fs     = require("fs");

/**
 * Generate SHA-256 hash from a file path
 * @param {string} filePath - Absolute path to file
 * @returns {string} hex-encoded SHA-256 hash
 */
function hashFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  return hashBuffer(buffer);
}

/**
 * Generate SHA-256 hash from a Buffer
 * @param {Buffer} buffer
 * @returns {string} hex-encoded SHA-256 hash
 */
function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Format bytes into human-readable string
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

module.exports = { hashFile, hashBuffer, formatFileSize };
