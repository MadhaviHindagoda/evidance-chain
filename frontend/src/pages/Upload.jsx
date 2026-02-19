import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { UploadCloud, File, CheckCircle, AlertCircle, Copy, ExternalLink, X, Shield } from "lucide-react";
import { uploadEvidence } from "../utils/api";

export default function Upload() {
  const [file, setFile]             = useState(null);
  const [form, setForm]             = useState({ fileName: "", description: "", caseId: "", uploaderAddress: "" });
  const [progress, setProgress]     = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult]         = useState(null);

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setForm(f => ({ ...f, fileName: accepted[0].name }));
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize:  50 * 1024 * 1024,
  });

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Please select a file first");

    const fd = new FormData();
    fd.append("file",             file);
    fd.append("fileName",         form.fileName || file.name);
    fd.append("description",      form.description);
    fd.append("caseId",           form.caseId);
    fd.append("uploaderAddress",  form.uploaderAddress);
    fd.append("fileType",         file.type);
    fd.append("fileSize",         file.size);

    try {
      setIsUploading(true);
      setProgress(0);
      const res = await uploadEvidence(fd, setProgress);
      setResult({ success: true, data: res.data.data });
      toast.success("Evidence registered on blockchain!");
    } catch (err) {
      const msg = err.response?.data?.error || "Upload failed";
      setResult({ success: false, error: msg });
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setProgress(0); setForm({ fileName: "", description: "", caseId: "", uploaderAddress: "" }); };

  const copyText = (text) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header">
        <div className="page-tag"><UploadCloud size={10} /> Upload</div>
        <h1>Register Evidence</h1>
        <p>Upload a file — its SHA-256 hash will be stored immutably on the blockchain</p>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Left — Form */}
        <div>
          <div className="card card-glow">
            <form onSubmit={handleSubmit}>
              {/* Dropzone */}
              <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""}`}>
                <input {...getInputProps()} />
                <div className="dropzone-icon">
                  <UploadCloud size={24} />
                </div>
                {file ? (
                  <>
                    <h3>{file.name}</h3>
                    <p>{formatSize(file.size)} · {file.type || "Unknown type"}</p>
                  </>
                ) : (
                  <>
                    <h3>Drop file here or click to browse</h3>
                    <p>PDF, Images, Videos, Documents · Max 50 MB</p>
                  </>
                )}
              </div>

              {file && (
                <div className="file-preview-card">
                  <div className="file-icon"><File size={18} /></div>
                  <div className="file-info">
                    <div className="file-name truncate">{file.name}</div>
                    <div className="file-meta">{formatSize(file.size)}</div>
                  </div>
                  <button type="button" className="copy-btn" onClick={reset}><X size={14} /></button>
                </div>
              )}

              <div className="mt-4">
                <div className="form-group">
                  <label className="form-label">Case ID *</label>
                  <input className="form-input" name="caseId" value={form.caseId} onChange={handleChange} placeholder="e.g. CASE-2024-001" required />
                </div>

                <div className="form-group">
                  <label className="form-label">Display File Name</label>
                  <input className="form-input" name="fileName" value={form.fileName} onChange={handleChange} placeholder="Optional — defaults to file name" />
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Notes</label>
                  <textarea className="form-textarea" name="description" value={form.description} onChange={handleChange} placeholder="Evidence description, context, or chain-of-custody notes..." />
                </div>

                <div className="form-group">
                  <label className="form-label">Uploader Wallet Address (optional)</label>
                  <input className="form-input" name="uploaderAddress" value={form.uploaderAddress} onChange={handleChange} placeholder="0x... (leave blank to use server account)" />
                </div>
              </div>

              {isUploading && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted mb-2">
                    <span>Uploading &amp; registering on blockchain…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg full-w" disabled={!file || isUploading}>
                {isUploading ? <><div className="spinner" style={{ borderTopColor: "#000" }} /> Registering…</> : <><Shield size={16} /> Register on Blockchain</>}
              </button>
            </form>
          </div>
        </div>

        {/* Right — Result / Info */}
        <div>
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                {result.success ? (
                  <div className="card" style={{ borderColor: "rgba(0,255,136,0.3)", background: "rgba(0,255,136,0.03)" }}>
                    <div className="flex items-center gap-3 mb-16" style={{ marginBottom: 16 }}>
                      <CheckCircle size={22} color="var(--green)" />
                      <div>
                        <div style={{ fontFamily: "var(--sans)", fontWeight: 700, color: "var(--green)", fontSize: 16 }}>Registered Successfully</div>
                        <div className="text-xs text-muted">Evidence hash stored on blockchain</div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Evidence ID</label>
                      <div className="hash-display flex items-center gap-2">
                        <span className="truncate">{result.data.evidenceId}</span>
                        <button className="copy-btn" onClick={() => copyText(result.data.evidenceId)}><Copy size={13} /></button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">SHA-256 File Hash</label>
                      <div className="hash-display flex items-center gap-2">
                        <span className="truncate">{result.data.fileHash}</span>
                        <button className="copy-btn" onClick={() => copyText(result.data.fileHash)}><Copy size={13} /></button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Transaction Hash</label>
                      <div className="hash-display flex items-center gap-2">
                        <span className="truncate">{result.data.transactionHash}</span>
                        <button className="copy-btn" onClick={() => copyText(result.data.transactionHash)}><Copy size={13} /></button>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <a href={`/evidence/${result.data.evidenceId}`} className="btn btn-outline btn-sm">
                        <ExternalLink size={13} /> View Evidence
                      </a>
                      <button className="btn btn-ghost btn-sm" onClick={reset}>Upload Another</button>
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ borderColor: "rgba(255,59,92,0.3)", background: "rgba(255,59,92,0.03)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <AlertCircle size={22} color="var(--red)" />
                      <div style={{ fontFamily: "var(--sans)", fontWeight: 700, color: "var(--red)", fontSize: 16 }}>Upload Failed</div>
                    </div>
                    <p className="text-sm text-muted">{result.error}</p>
                    <button className="btn btn-ghost btn-sm mt-4" onClick={reset}>Try Again</button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="card">
                  <div className="section-title"><Shield size={14} /> How It Works</div>
                  {[
                    ["1. File Upload",    "File is received by the backend server securely"],
                    ["2. SHA-256 Hash",   "A unique cryptographic fingerprint is computed"],
                    ["3. Blockchain Write", "Hash + metadata stored in the smart contract"],
                    ["4. Immutable Record","The entry cannot be modified or deleted"],
                  ].map(([step, desc]) => (
                    <div key={step} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 12, color: "var(--cyan)", fontWeight: 600, marginBottom: 2 }}>{step}</div>
                      <div className="text-xs text-muted">{desc}</div>
                    </div>
                  ))}
                  <div className="text-xs text-muted" style={{ marginTop: 8, lineHeight: 1.8 }}>
                    ⚠️ The <strong style={{ color: "var(--text-2)" }}>file itself</strong> is stored on the server (or IPFS).
                    The <strong style={{ color: "var(--text-2)" }}>hash</strong> is what lives on-chain.
                    Any change to the file — even a single byte — will produce a different hash.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
