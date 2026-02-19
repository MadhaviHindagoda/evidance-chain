# 🔐 EvidenceChain — Secure Digital Evidence Management Using Blockchain

A production-grade blockchain + cybersecurity project that stores cryptographic hashes of digital evidence immutably on Ethereum (Ganache), with a full-featured React frontend and Node.js API backend.

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│   Upload · Verify · Evidence List · Detail · Dashboard      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (REST API)
┌──────────────────────▼──────────────────────────────────────┐
│                   Node.js + Express                          │
│   /api/evidence/upload · verify · all · :id · :id/seal     │
│   Helmet · CORS · Rate Limiting · Morgan logging            │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
    ┌────────▼───────┐        ┌─────────▼────────┐
    │  File Storage  │        │  Ganache / ETH   │
    │  ./uploads/    │        │  Smart Contract  │
    │  (or IPFS)     │        │  EvidenceChain   │
    └────────────────┘        └──────────────────┘
```

---

## 🛡️ Cybersecurity Features

| Feature | Implementation |
|---|---|
| **Integrity** | SHA-256 hash stored on-chain — any file change = hash mismatch |
| **Tamper Detection** | Re-hash on verify, compare against blockchain record |
| **Non-repudiation** | Wallet address + timestamp in immutable audit trail |
| **Authentication** | Ethereum wallet address (MetaMask-ready) |
| **Confidentiality** | Optional IPFS + encryption (extensible) |
| **Immutability** | Seal function — sealed evidence cannot be altered |
| **Rate Limiting** | Express rate-limit on all API routes |
| **Input Hardening** | Helmet.js headers + CORS restrictions |

---

## ⚙️ Prerequisites

| Tool | Version | Download |
|---|---|---|
| Node.js | ≥ 18.x | https://nodejs.org |
| Ganache GUI | Latest | https://trufflesuite.com/ganache |
| Truffle | ≥ 5.x | `npm install -g truffle` |

---

## 🖥️ How to Use the Application

### Upload Evidence
1. Go to **Upload** page
2. Drag & drop or click to select a file (PDF, image, video, etc.)
3. Fill in: **Case ID** (required), Description, Uploader address (optional)
4. Click **"Register on Blockchain"**
5. Copy the **Evidence ID** and **SHA-256 hash** from the success result

### Verify Evidence
1. Go to **Verify** page
2. Drop the same file
3. Click **"Verify Integrity"**
4. ✅ = hash matches blockchain (untampered)
5. ❌ = hash mismatch (file was modified or not registered)

### Browse Evidence
1. Go to **Evidence** page
2. Search by file name, Case ID, or hash
3. Filter by status (Active, Sealed, Disputed, etc.)
4. Click any row to view full detail + audit trail

### Seal Evidence
1. Open any evidence detail page
2. Click **"Seal Evidence"**
3. Sealed evidence cannot have its status changed (immutable record)

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/evidence/upload` | Upload file + register hash on-chain |
| POST | `/api/evidence/verify` | Verify file integrity |
| GET | `/api/evidence/all` | Get all evidence records |
| GET | `/api/evidence/:id` | Get single evidence + audit logs |
| POST | `/api/evidence/:id/seal` | Seal evidence |
| GET | `/api/evidence/stats/overview` | Dashboard statistics |
| GET | `/api/health` | Server health check |

---


**Confidentiality** — Files can be encrypted before upload. IPFS integration adds content-addressed distributed storage. Smart contract stores only hashes, not file content.

**Auditability** — `AuditLog[]` array in the contract stores a tamper-proof history of every action taken on each piece of evidence.

---

## 📜 License

MIT — for educational purposes.
