import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { List, Search, RefreshCw, Database, Lock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { getAllEvidence } from "../utils/api";

const STATUS_BADGE = {
  Active:      "badge-green",
  UnderReview: "badge-yellow",
  Archived:    "badge-grey",
  Disputed:    "badge-red",
};

export default function EvidenceList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey:       ["evidence"],
    queryFn:        () => getAllEvidence().then(r => r.data.data),
    refetchInterval: 15000,
  });

  const evidence = (data || []).filter(e => {
    const matchSearch =
      !search ||
      e.fileName?.toLowerCase().includes(search.toLowerCase()) ||
      e.caseId?.toLowerCase().includes(search.toLowerCase()) ||
      e.fileHash?.includes(search);
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "sealed" ? e.isSealed : e.status === filterStatus);
    return matchSearch && matchStatus;
  });

  const fmt = ts => ts ? format(new Date(ts * 1000), "dd MMM yy") : "—";

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header flex items-center justify-between" style={{ display: "flex", alignItems: "flex-start" }}>
        <div>
          <div className="page-tag"><List size={10} /> Evidence Registry</div>
          <h1>All Evidence</h1>
          <p>All registered evidence records stored on the blockchain</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refetch} disabled={isFetching} style={{ marginTop: 8 }}>
          <RefreshCw size={13} className={isFetching ? "spin" : ""} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: "16px 20px" }}>
        <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
          <div className="flex items-center gap-2" style={{ flex: "1 1 240px" }}>
            <Search size={14} color="var(--text-3)" />
            <input
              className="form-input"
              placeholder="Search by name, case ID, or hash…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", padding: "4px 0" }}
            />
          </div>
          <div className="flex gap-2">
            {["all", "Active", "sealed", "Disputed", "Archived"].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`btn btn-sm ${filterStatus === s ? "btn-primary" : "btn-ghost"}`}
                style={filterStatus === s ? {} : {}}
              >
                {s === "sealed" ? <><Lock size={11} /> Sealed</> : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card card-glow" style={{ padding: 0 }}>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ padding: "60px 0" }}>
            <div className="spinner" />
          </div>
        ) : evidence.length === 0 ? (
          <div className="empty-state">
            <Database size={40} />
            <h3>{search ? "No results found" : "No evidence registered yet"}</h3>
            <p>{search ? "Try a different search term" : "Upload your first evidence file to get started"}</p>
          </div>
        ) : (
          <table className="evidence-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Case ID</th>
                <th>SHA-256 Hash</th>
                <th>Uploader</th>
                <th>Status</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((e, i) => (
                <motion.tr
                  key={e.evidenceId || i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/evidence/${e.evidenceId}`)}
                >
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--text-1)", fontSize: 13 }}>
                      <div className="truncate" style={{ maxWidth: 180 }}>{e.fileName}</div>
                      <div className="text-xs text-muted" style={{ marginTop: 2 }}>{e.fileType}</div>
                    </div>
                  </td>
                  <td>
                    {e.caseId
                      ? <span className="badge badge-cyan">{e.caseId}</span>
                      : <span className="text-muted text-xs">—</span>}
                  </td>
                  <td>
                    <code className="text-xs" style={{ color: "var(--text-3)", fontFamily: "var(--mono)" }}>
                      {e.fileHash?.slice(0, 20)}…
                    </code>
                  </td>
                  <td>
                    <code className="text-xs" style={{ color: "var(--text-3)" }}>
                      {e.uploader?.slice(0, 10)}…
                    </code>
                  </td>
                  <td>
                    {e.isSealed
                      ? <span className="badge badge-purple"><Lock size={9} /> Sealed</span>
                      : <span className={`badge ${STATUS_BADGE[e.status] || "badge-grey"}`}>
                          {e.status === "Disputed" && <AlertTriangle size={9} />}
                          {e.status}
                        </span>
                    }
                  </td>
                  <td className="text-xs text-muted">{fmt(e.timestamp)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {evidence.length > 0 && (
        <div className="text-xs text-muted mt-4" style={{ textAlign: "right" }}>
          Showing {evidence.length} of {data?.length || 0} records
        </div>
      )}
    </motion.div>
  );
}
