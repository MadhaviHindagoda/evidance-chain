import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, UploadCloud, Search, List, LayoutDashboard, Lock } from "lucide-react";

import Dashboard  from "./pages/Dashboard";
import Upload     from "./pages/Upload";
import Verify     from "./pages/Verify";
import EvidenceList from "./pages/EvidenceList";
import EvidenceDetail from "./pages/EvidenceDetail";

import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

const NAV_ITEMS = [
  { to: "/",         label: "Dashboard",  icon: LayoutDashboard, exact: true },
  { to: "/upload",   label: "Upload",     icon: UploadCloud },
  { to: "/verify",   label: "Verify",     icon: Search },
  { to: "/evidence", label: "Evidence",   icon: List },
];

function Layout({ children }) {
  const location = useLocation();
  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Shield size={22} strokeWidth={1.5} />
          </div>
          <div className="brand-text">
            <span className="brand-name">Evidence</span>
            <span className="brand-sub">Chain</span>
          </div>
          <div className="brand-badge">
            <Lock size={10} />
            <span>Secured</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{label}</span>
              <div className="nav-indicator" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="chain-status">
            <span className="status-dot" />
            <span>Ganache Local</span>
          </div>
          <div className="sidebar-ver">v1.0.0</div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="page-wrapper"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/"                   element={<Dashboard />} />
            <Route path="/upload"             element={<Upload />} />
            <Route path="/verify"             element={<Verify />} />
            <Route path="/evidence"           element={<EvidenceList />} />
            <Route path="/evidence/:id"       element={<EvidenceDetail />} />
          </Routes>
        </Layout>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#0f1117",
              color:      "#e2e8f0",
              border:     "1px solid #1e293b",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize:   "13px",
            },
          }}
        />
      </Router>
    </QueryClientProvider>
  );
}
