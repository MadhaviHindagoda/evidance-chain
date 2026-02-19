import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowLeft, Copy, Lock, Clock, User, Shield, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";
import { getEvidenceById, sealEvidence } from "../utils/api";

export default function EvidenceDetail() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const queryClient    = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["evidence", id],
    queryFn:  () => getEvidenceById(id).then(r => r.data.data),
  });

  const sealMutation = useMutation({
    mutationFn: () => sealEvidence(id),
    onSuccess: () => {
      toast.success("Evidence sealed — now immutable on blockchain");
      queryClient.invalidateQueries(["evidence", id]);
      queryClient.invalidateQueries(["evidence"]);
    },
    onError: (err) => toast.error(err.response?.data?.error || "Seal failed"),
  });

  const copyText = (t) => { navigator.clipboard.writeText(t); toast.success("Copied!"); };
  const fmt = ts => ts ? format(new Date(ts * 1000), "dd MMM yyyy, HH:mm:ss 'UTC'") : "—";

  if (isLoading) return (
    <div className="flex items-center justify-center" style={{ height: "60vh" }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  if (error || !data) return (
    <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
      <AlertTriangle size={40} color="var(--red)" style={{ margin: "0 auto 16px" }} />
      <div style={{ color: "var(--red)", fontFamily: "var(--sans)", fontWeight: 600 }}>Evidence not found</div>
      <button className="btn btn-ghost btn-sm mt-4" onClick={() => navigate(-1)}>← Go Back</button>
    </div>
  );

  const e = data;
  const statusColor = { Active: "badge-green", UnderReview: "badge-yellow", Archived: "badge-grey", Disputed: "badge-red" };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div className="page-tag"><FileText size={10} /> Evidence Record</div>
          <h1 style={{ fontFamily: "var(--sans)", fontSize: 22, fontWeight: 700, margin: 0 }}>
            {e.fileName}
          </h1>
        </div>
        <div className="flex gap-2">
          {e.isSealed
            ? <span className="badge badge-purple"><Lock size={11} /> Sealed</span>
            : <button
                className="btn btn-danger btn-sm"
                onClick={() => { if (window.confirm("Seal this evidence? This action is IRREVERSIBLE.")) sealMutation.mutate(); }}
                disabled={sealMutation.isPending}
              >
                <Lock size={13} /> Seal Evidence
              </button>
          }
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Left — Details */}
        <div className="flex flex-col gap-4">
          {/* Core Info */}
          <div className="card card-glow">
            <div className="section-title"><Shield size={14} /> Evidence Metadata</div>

            {[
              ["Case ID",      e.caseId || "—"],
              ["File Type",    e.fileType || "—"],
              ["File Size",    e.fileSize ? `${e.fileSize.toLocaleString()} bytes` : "—"],
              ["Status",       null, <span className={`badge ${statusColor[e.status] || "badge-grey"}`}>{e.status}</span>],
              ["Sealed",       null, e.isSealed
                ? <span className="badge badge-purple"><Lock size={9} /> Immutable</span>
                : <span className="badge badge-grey">No</span>
              ],
            ].map(([label, val, el]) => (
              <div key={label} className="flex justify-between items-center" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs text-muted" style={{ minWidth: 80 }}>{label}</span>
                {el || <span className="text-xs" style={{ color: "var(--text-1)", textAlign: "right" }}>{val}</span>}
              </div>
            ))}

            {e.description && (
              <div style={{ marginTop: 12 }}>
                <div className="text-xs text-muted mb-2">Description / Notes</div>
                <div className="text-xs" style={{ color: "var(--text-2)", lineHeight: 1.7, background: "var(--bg-2)", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border)" }}>
                  {e.description}
                </div>
              </div>
            )}
          </div>

          {/* Timestamps & Uploader */}
          <div className="card">
            <div className="section-title"><Clock size={14} /> Chain of Custody</div>

            <div style={{ marginBottom: 14 }}>
              <div className="text-xs text-muted mb-2">Registered On-Chain</div>
              <div className="text-xs flex items-center gap-2" style={{ color: "var(--cyan)" }}>
                <Clock size={11} /> {fmt(e.timestamp)}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted mb-2">Uploader Wallet</div>
              <div className="hash-display flex items-center gap-2 text-xs">
                <User size={11} />
                <span className="truncate">{e.uploader}</span>
                <button className="copy-btn" onClick={() => copyText(e.uploader)}><Copy size={11} /></button>
              </div>
            </div>

            {e.ipfsHash && (
              <div style={{ marginTop: 14 }}>
                <div className="text-xs text-muted mb-2">IPFS CID</div>
                <div className="hash-display flex items-center gap-2 text-xs">
                  <span className="truncate">{e.ipfsHash}</span>
                  <button className="copy-btn" onClick={() => copyText(e.ipfsHash)}><Copy size={11} /></button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — Hashes + Audit */}
        <div className="flex flex-col gap-4">
          <div className="card card-glow">
            <div className="section-title">SHA-256 File Hash</div>
            <div className="hash-display flex items-center gap-2" style={{ wordBreak: "break-all" }}>
              <span style={{ flex: 1 }}>{e.fileHash}</span>
              <button className="copy-btn" onClick={() => copyText(e.fileHash)}><Copy size={13} /></button>
            </div>
            <div className="text-xs text-muted mt-3" style={{ lineHeight: 1.7 }}>
              This hash is the cryptographic fingerprint of the original file.
              Any modification — even a single byte — will produce a different hash, proving tampering.
            </div>
          </div>

          {/* Evidence ID */}
          <div className="card">
            <div className="text-xs text-muted mb-2">On-Chain Evidence ID (bytes32)</div>
            <div className="hash-display flex items-center gap-2 text-xs">
              <span className="truncate">{id}</span>
              <button className="copy-btn" onClick={() => copyText(id)}><Copy size={11} /></button>
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="card">
            <div className="section-title"><Clock size={14} /> Blockchain Audit Trail</div>
            {e.auditLogs?.length > 0 ? (
              <div className="audit-timeline">
                {[...e.auditLogs].reverse().map((log, i) => (
                  <div key={i} className="audit-entry">
                    <div className="audit-meta">
                      <div className="audit-action">{log.action.replace(/_/g, " ")}</div>
                      <div className="audit-address">
                        {log.actor?.slice(0, 14)}…{log.actor?.slice(-6)}
                      </div>
                      {log.notes && <div className="text-xs text-muted">{log.notes}</div>}
                    </div>
                    <div className="audit-time">{fmt(log.timestamp)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted">No audit logs available</div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
