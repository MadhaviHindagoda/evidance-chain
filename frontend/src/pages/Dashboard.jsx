import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, FileCheck, Lock, AlertTriangle, ArrowRight, Database, Zap, Clock } from "lucide-react";
import { format } from "date-fns";
import { getStats, getAllEvidence } from "../utils/api";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const statusColor = {
  Active:      "badge-green",
  UnderReview: "badge-yellow",
  Archived:    "badge-grey",
  Disputed:    "badge-red",
};

export default function Dashboard() {
  const { data: statsData } = useQuery({
    queryKey: ["stats"],
    queryFn:  () => getStats().then(r => r.data.data),
    refetchInterval: 10000,
  });

  const { data: evidenceData, isLoading } = useQuery({
    queryKey: ["evidence"],
    queryFn:  () => getAllEvidence().then(r => r.data.data),
    refetchInterval: 10000,
  });

  const stats = statsData || { total: 0, active: 0, sealed: 0, disputed: 0 };
  const recent = (evidenceData || []).slice(0, 5);

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={item} className="page-header">
        <div className="page-tag">
          <Shield size={10} />
          Overview
        </div>
        <h1>Evidence Dashboard</h1>
        <p>Blockchain-secured digital evidence management system</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="stat-grid">
        <div className="stat-card cyan">
          <div className="stat-icon cyan"><Database size={16} /></div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Evidence</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon green"><FileCheck size={16} /></div>
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon purple"><Lock size={16} /></div>
          <div className="stat-value">{stats.sealed}</div>
          <div className="stat-label">Sealed</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon red"><AlertTriangle size={16} /></div>
          <div className="stat-value">{stats.disputed}</div>
          <div className="stat-label">Disputed</div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item} className="grid-2" style={{ marginBottom: 24 }}>
        <Link to="/upload" style={{ textDecoration: "none" }}>
          <div className="card" style={{ cursor: "pointer", borderColor: "var(--border-2)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="stat-icon cyan"><Zap size={16} /></div>
              <div>
                <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 15, color: "var(--text-1)" }}>Upload Evidence</div>
                <div className="text-xs text-muted">Hash &amp; register a file on-chain</div>
              </div>
              <ArrowRight size={16} color="var(--cyan)" style={{ marginLeft: "auto" }} />
            </div>
          </div>
        </Link>
        <Link to="/verify" style={{ textDecoration: "none" }}>
          <div className="card" style={{ cursor: "pointer", borderColor: "var(--border-2)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="stat-icon green"><Shield size={16} /></div>
              <div>
                <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 15, color: "var(--text-1)" }}>Verify Integrity</div>
                <div className="text-xs text-muted">Check if a file has been tampered</div>
              </div>
              <ArrowRight size={16} color="var(--green)" style={{ marginLeft: "auto" }} />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Recent Evidence */}
      <motion.div variants={item} className="card card-glow">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title" style={{ borderBottom: "none", marginBottom: 0 }}>
            <Clock size={14} />
            Recent Evidence
          </div>
          <Link to="/evidence" className="btn btn-ghost btn-sm">
            View All <ArrowRight size={13} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center" style={{ padding: "40px 0" }}>
            <div className="spinner" />
          </div>
        ) : recent.length === 0 ? (
          <div className="empty-state">
            <Database size={40} />
            <h3>No evidence uploaded yet</h3>
            <p>Start by uploading your first file</p>
          </div>
        ) : (
          <table className="evidence-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Case ID</th>
                <th>Hash (SHA-256)</th>
                <th>Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e, i) => (
                <tr key={e.evidenceId || i} onClick={() => window.location.href = `/evidence/${e.evidenceId}`}>
                  <td style={{ color: "var(--text-1)", fontWeight: 500 }}>
                    <div className="truncate" style={{ maxWidth: 180 }}>{e.fileName}</div>
                  </td>
                  <td>
                    <span className="badge badge-cyan">{e.caseId || "—"}</span>
                  </td>
                  <td>
                    <span className="text-xs text-muted" style={{ fontFamily: "var(--mono)" }}>
                      {e.fileHash?.slice(0, 16)}…
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${statusColor[e.status] || "badge-grey"}`}>
                      {e.isSealed ? "🔒 Sealed" : e.status}
                    </span>
                  </td>
                  <td className="text-xs text-muted">
                    {e.timestamp ? format(new Date(e.timestamp * 1000), "dd MMM yyyy, HH:mm") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Security Info */}
      <motion.div variants={item} className="card" style={{ marginTop: 20, background: "transparent", border: "1px solid var(--border)" }}>
        <div className="flex gap-6" style={{ flexWrap: "wrap" }}>
          {[
            { label: "Integrity", how: "SHA-256 hashing + blockchain immutability" },
            { label: "Non-repudiation", how: "Wallet address audit trail" },
            { label: "Tamper Detection", how: "Hash mismatch on verification" },
            { label: "Authentication", how: "MetaMask / wallet address" },
          ].map(({ label, how }) => (
            <div key={label} style={{ flex: "1 1 160px", minWidth: 140 }}>
              <div className="text-xs" style={{ color: "var(--cyan)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {label}
              </div>
              <div className="text-xs text-muted">{how}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
