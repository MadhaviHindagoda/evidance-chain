import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Search, CheckCircle, XCircle, UploadCloud, Copy, Clock, User, Shield, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { verifyEvidence } from "../utils/api";

export default function Verify() {
  const [file, setFile]           = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [result, setResult]       = useState(null);

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) { setFile(accepted[0]); setResult(null); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });

  const handleVerify = async () => {
    if (!file) return toast.error("Drop a file to verify");

    const fd = new FormData();
    fd.append("file", file);

    try {
      setIsVerifying(true);
      setProgress(0);
      const res = await verifyEvidence(fd, setProgress);
      setResult(res.data);
      if (res.data.isValid) toast.success("File integrity verified!");
      else toast.error("File not found on blockchain — possibly tampered!");
    } catch (err) {
      toast.error("Verification failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsVerifying(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setProgress(0); };
  const copyText = (t) => { navigator.clipboard.writeText(t); toast.success("Copied!"); };
  const fmt = (ts) => ts ? format(new Date(ts * 1000), "dd MMM yyyy, HH:mm:ss") : "—";

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header">
        <div className="page-tag"><Search size={10} /> Verify</div>
        <h1>Verify Evidence Integrity</h1>
        <p>Upload any file to check if its SHA-256 hash matches the blockchain record</p>
      </div>

      {/* Upload zone */}
      <div className="card card-glow" style={{ marginBottom: 24 }}>
        <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""}`}>
          <input {...getInputProps()} />
          <div className="dropzone-icon" style={{ background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.2)" }}>
            <Search size={24} color="var(--green)" />
          </div>
          {file ? (
            <>
              <h3 style={{ color: "var(--text-1)" }}>{file.name}</h3>
              <p>File selected · Click Verify to check integrity</p>
            </>
          ) : (
            <>
              <h3>Drop evidence file here to verify</h3>
              <p>The file is hashed locally and compared against the blockchain — file is not stored again</p>
            </>
          )}
        </div>

        {file && (
          <div className="flex gap-3 mt-4" style={{ justifyContent: "center" }}>
            {isVerifying && (
              <div style={{ width: "100%", marginBottom: 12 }}>
                <div className="flex justify-between text-xs text-muted mb-2">
                  <span>Computing hash &amp; verifying…</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--green), var(--cyan))" }} />
                </div>
              </div>
            )}
            <div className="flex gap-3 full-w">
              <button className="btn btn-primary btn-lg" style={{ flex: 1, background: "var(--green)", color: "#000" }} onClick={handleVerify} disabled={isVerifying}>
                {isVerifying ? <><div className="spinner" style={{ borderTopColor: "#000" }} /> Verifying…</> : <><FileCheck size={16} /> Verify Integrity</>}
              </button>
              <button className="btn btn-ghost" onClick={reset}>Clear</button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Verdict Banner */}
            <div className={`verify-result ${result.isValid ? "valid" : "invalid"}`} style={{ marginBottom: 20 }}>
              <div className="verify-icon">
                {result.isValid ? <CheckCircle size={32} /> : <XCircle size={32} />}
              </div>
              <h2>{result.isValid ? "✅ File Integrity Verified" : "❌ Tampered or Unregistered"}</h2>
              <p style={{ color: result.isValid ? "var(--green-dim)" : "var(--red)", opacity: 0.8, fontSize: 13 }}>
                {result.message}
              </p>

              {/* Computed hash */}
              <div style={{ marginTop: 16, background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "10px 14px", textAlign: "left" }}>
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Computed SHA-256 Hash</div>
                <div className="flex items-center gap-2">
                  <code style={{ fontFamily: "var(--mono)", fontSize: 11, color: result.isValid ? "var(--green)" : "var(--red)", wordBreak: "break-all", flex: 1 }}>
                    {result.fileHash}
                  </code>
                  <button className="copy-btn" onClick={() => copyText(result.fileHash)}><Copy size={13} /></button>
                </div>
              </div>
            </div>

            {/* Evidence Details (if valid) */}
            {result.isValid && result.evidence && (
              <div className="grid-2" style={{ gap: 20 }}>
                <div className="card">
                  <div className="section-title"><Shield size={14} /> Evidence Details</div>

                  {[
                    ["File Name",    result.evidence.fileName],
                    ["File Type",    result.evidence.fileType],
                    ["File Size",    `${result.evidence.fileSize} bytes`],
                    ["Case ID",      result.evidence.caseId || "—"],
                    ["Status",       result.evidence.status],
                    ["Sealed",       result.evidence.isSealed ? "Yes (Immutable)" : "No"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                      <span className="text-xs text-muted">{label}</span>
                      <span className="text-xs" style={{ color: "var(--text-1)", maxWidth: 180, textAlign: "right", wordBreak: "break-word" }}>{val}</span>
                    </div>
                  ))}

                  <div style={{ marginTop: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div className="text-xs text-muted mb-2">Uploader</div>
                    <div className="hash-display text-xs flex gap-2 items-center">
                      <User size={12} />
                      <span className="truncate">{result.evidence.uploader}</span>
                      <button className="copy-btn" onClick={() => copyText(result.evidence.uploader)}><Copy size={11} /></button>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div className="text-xs text-muted mb-2">Registered At</div>
                    <div className="text-xs flex items-center gap-2" style={{ color: "var(--text-1)" }}>
                      <Clock size={12} color="var(--cyan)" />
                      {fmt(result.evidence.timestamp)}
                    </div>
                  </div>

                  {result.evidence.description && (
                    <div style={{ marginTop: 12 }}>
                      <div className="text-xs text-muted mb-2">Description</div>
                      <div className="text-xs" style={{ color: "var(--text-2)", lineHeight: 1.7 }}>{result.evidence.description}</div>
                    </div>
                  )}
                </div>

                {/* Audit Logs */}
                <div className="card">
                  <div className="section-title"><Clock size={14} /> Audit Trail</div>
                  {result.auditLogs?.length > 0 ? (
                    <div className="audit-timeline">
                      {result.auditLogs.map((log, i) => (
                        <div key={i} className="audit-entry">
                          <div className="audit-meta">
                            <div className="audit-action">{log.action}</div>
                            <div className="audit-address">{log.actor?.slice(0, 20)}…</div>
                            <div className="text-xs text-muted">{log.notes}</div>
                          </div>
                          <div className="audit-time">{fmt(log.timestamp)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted">No audit logs found</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button className="btn btn-ghost btn-sm" onClick={reset}>Verify Another File</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info box when no result */}
      {!result && !file && (
        <div className="card" style={{ background: "transparent" }}>
          <div className="section-title">Security Model</div>
          <div className="grid-2" style={{ gap: 12 }}>
            {[
              { icon: "🔐", t: "SHA-256 Hashing",    d: "The file's content is converted to a fixed 256-bit fingerprint. Any byte change = new hash." },
              { icon: "⛓️", t: "Blockchain Anchor",   d: "The hash was stored in a smart contract at a specific block and timestamp — immutable." },
              { icon: "🔍", t: "Deterministic Verify",d: "Re-hashing the same file always yields the same result if untouched." },
              { icon: "⚠️", t: "Tamper Detection",    d: "If hashes differ, the file has been modified after initial registration." },
            ].map(({ icon, t, d }) => (
              <div key={t} style={{ padding: 14, background: "var(--bg-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 13, color: "var(--text-1)", marginBottom: 4 }}>{t}</div>
                <div className="text-xs text-muted" style={{ lineHeight: 1.6 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
