/**
 * blockchain.js
 * Web3 wrapper for interacting with the EvidenceChain smart contract
 */

const { Web3 } = require("web3");
const path     = require("path");
const fs       = require("fs");

let web3;
let contract;
let deployerAccount;

/**
 * Initialize Web3 and contract instance
 */
async function initBlockchain() {
  const rpcUrl          = process.env.BLOCKCHAIN_RPC_URL  || "http://127.0.0.1:7545";
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const privateKey      = process.env.DEPLOYER_PRIVATE_KEY;

  if (!contractAddress || contractAddress === "0xYourContractAddressHere") {
    throw new Error(
      "CONTRACT_ADDRESS not set in .env — deploy the contract first with: truffle migrate"
    );
  }

  // Connect to Ganache
  web3 = new Web3(rpcUrl);

  // Load ABI from truffle build artifacts
  const artifactPath = path.join(
    __dirname, "..", "..", "build", "contracts", "EvidenceChain.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Contract artifact not found at ${artifactPath}. Run: truffle migrate`
    );
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  contract = new web3.eth.Contract(artifact.abi, contractAddress);

  // Add deployer account from private key
  if (privateKey) {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    deployerAccount = account.address;
  } else {
    const accounts  = await web3.eth.getAccounts();
    deployerAccount = accounts[0];
  }

  console.log(`✅ Blockchain connected: ${rpcUrl}`);
  console.log(`✅ Contract: ${contractAddress}`);
  console.log(`✅ Deployer: ${deployerAccount}`);

  return { web3, contract, deployerAccount };
}

/**
 * Add evidence to the blockchain
 */
async function addEvidence({
  fileHash, ipfsHash = "", fileName, fileType, fileSize,
  description = "", caseId = "", uploaderAddress,
}) {
  const from = uploaderAddress || deployerAccount;

  const gas = await contract.methods
    .addEvidence(fileHash, ipfsHash, fileName, fileType, fileSize, description, caseId)
    .estimateGas({ from });

  const receipt = await contract.methods
    .addEvidence(fileHash, ipfsHash, fileName, fileType, fileSize, description, caseId)
    .send({ from, gas: Math.ceil(Number(gas) * 1.2) });

  // Extract evidenceId from event logs
  const event = receipt.events?.EvidenceAdded;
  const evidenceId = event?.returnValues?.evidenceId;

  return { receipt, evidenceId, transactionHash: receipt.transactionHash };
}

/**
 * Verify a file hash on-chain
 */
async function verifyEvidence(fileHash) {
  const result = await contract.methods.verifyEvidence(fileHash).call();
  return {
    isValid:    result.isValid,
    evidenceId: result.evidenceId,
    uploader:   result.uploader,
    timestamp:  Number(result.timestamp),
  };
}

/**
 * Get full evidence record
 */
async function getEvidence(evidenceId) {
  const e = await contract.methods.getEvidence(evidenceId).call();
  return serializeEvidence(e);
}

/**
 * Get evidence by file hash
 */
async function getEvidenceByHash(fileHash) {
  const e = await contract.methods.getEvidenceByHash(fileHash).call();
  return serializeEvidence(e);
}

/**
 * Get all evidence IDs
 */
async function getAllEvidenceIds() {
  return contract.methods.getAllEvidenceIds().call();
}

/**
 * Get audit logs for evidence
 */
async function getAuditLogs(evidenceId) {
  const logs = await contract.methods.getAuditLogs(evidenceId).call();
  return logs.map(l => ({
    actor:     l.actor,
    action:    l.action,
    timestamp: Number(l.timestamp),
    notes:     l.notes,
  }));
}

/**
 * Seal evidence
 */
async function sealEvidence(evidenceId, fromAddress) {
  const from = fromAddress || deployerAccount;
  const gas  = await contract.methods.sealEvidence(evidenceId).estimateGas({ from });
  const receipt = await contract.methods
    .sealEvidence(evidenceId)
    .send({ from, gas: Math.ceil(Number(gas) * 1.2) });
  return receipt;
}

/**
 * Get total evidence count
 */
async function getEvidenceCount() {
  const count = await contract.methods.getEvidenceCount().call();
  return Number(count);
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

const STATUS_MAP = ["Active", "UnderReview", "Archived", "Disputed"];

function serializeEvidence(e) {
  return {
    fileHash:    e.fileHash,
    ipfsHash:    e.ipfsHash,
    fileName:    e.fileName,
    fileType:    e.fileType,
    fileSize:    Number(e.fileSize),
    description: e.description,
    caseId:      e.caseId,
    timestamp:   Number(e.timestamp),
    uploader:    e.uploader,
    isSealed:    e.isSealed,
    status:      STATUS_MAP[Number(e.status)] || "Active",
  };
}

module.exports = {
  initBlockchain,
  addEvidence,
  verifyEvidence,
  getEvidence,
  getEvidenceByHash,
  getAllEvidenceIds,
  getAuditLogs,
  sealEvidence,
  getEvidenceCount,
};
