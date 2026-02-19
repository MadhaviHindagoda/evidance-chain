/**
 * api.js — Axios client for EvidenceChain backend
 */

import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 30000,
});

// ─────────────────────────────────────────────
//  Evidence API
// ─────────────────────────────────────────────

export const uploadEvidence = (formData, onProgress) =>
  api.post("/evidence/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? e => onProgress(Math.round((e.loaded * 100) / e.total))
      : undefined,
  });

export const verifyEvidence = (formData, onProgress) =>
  api.post("/evidence/verify", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? e => onProgress(Math.round((e.loaded * 100) / e.total))
      : undefined,
  });

export const getAllEvidence = () => api.get("/evidence/all");

export const getEvidenceById = (id) => api.get(`/evidence/${id}`);

export const sealEvidence = (id, fromAddress) =>
  api.post(`/evidence/${id}/seal`, { fromAddress });

export const getStats = () => api.get("/evidence/stats/overview");

export const healthCheck = () => api.get("/health");

export default api;
