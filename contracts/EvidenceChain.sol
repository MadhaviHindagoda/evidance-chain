// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EvidenceChain
 * @dev Secure Digital Evidence Management System
 * Stores cryptographic hashes and metadata of digital evidence immutably on-chain.
 */
contract EvidenceChain {
    // ─────────────────────────────────────────────
    //  Data Structures
    // ─────────────────────────────────────────────

    struct Evidence {
        string  fileHash;       // SHA-256 hash of the file
        string  ipfsHash;       // IPFS CID (optional)
        string  fileName;       // Original file name
        string  fileType;       // MIME type
        uint256 fileSize;       // File size in bytes
        string  description;    // Case description / notes
        string  caseId;         // Case reference ID
        uint256 timestamp;      // Block timestamp of upload
        address uploader;       // Wallet address of uploader
        bool    isSealed;       // Sealed evidence cannot be deleted
        EvidenceStatus status;  // Current status
    }

    enum EvidenceStatus { Active, UnderReview, Archived, Disputed }

    struct AuditLog {
        address actor;
        string  action;
        uint256 timestamp;
        string  notes;
    }

    // ─────────────────────────────────────────────
    //  Storage
    // ─────────────────────────────────────────────

    mapping(bytes32 => Evidence)    private evidenceStore;
    mapping(bytes32 => AuditLog[])  private auditLogs;
    mapping(address => bytes32[])   private uploaderEvidence;
    mapping(string  => bytes32)     private hashToId;      // fileHash → evidenceId
    bytes32[] private allEvidenceIds;

    address public owner;
    uint256 public totalEvidence;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event EvidenceAdded(
        bytes32 indexed evidenceId,
        string  fileHash,
        string  fileName,
        string  caseId,
        address indexed uploader,
        uint256 timestamp
    );

    event EvidenceSealed(bytes32 indexed evidenceId, address sealedBy);
    event EvidenceStatusUpdated(bytes32 indexed evidenceId, EvidenceStatus newStatus, address updatedBy);
    event EvidenceAuditLogged(bytes32 indexed evidenceId, address actor, string action);

    // ─────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier evidenceExists(bytes32 evidenceId) {
        require(bytes(evidenceStore[evidenceId].fileHash).length > 0, "Evidence not found");
        _;
    }

    modifier notSealed(bytes32 evidenceId) {
        require(!evidenceStore[evidenceId].isSealed, "Evidence is sealed");
        _;
    }

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────────
    //  Core Functions
    // ─────────────────────────────────────────────

    /**
     * @dev Add new evidence to the blockchain
     */
    function addEvidence(
        string memory fileHash,
        string memory ipfsHash,
        string memory fileName,
        string memory fileType,
        uint256 fileSize,
        string memory description,
        string memory caseId
    ) external returns (bytes32) {
        require(bytes(fileHash).length > 0,  "File hash required");
        require(bytes(fileName).length > 0,  "File name required");
        require(hashToId[fileHash] == bytes32(0), "Evidence with this hash already exists");

        // Generate unique evidence ID
        bytes32 evidenceId = keccak256(
            abi.encodePacked(fileHash, msg.sender, block.timestamp, block.number)
        );

        evidenceStore[evidenceId] = Evidence({
            fileHash:    fileHash,
            ipfsHash:    ipfsHash,
            fileName:    fileName,
            fileType:    fileType,
            fileSize:    fileSize,
            description: description,
            caseId:      caseId,
            timestamp:   block.timestamp,
            uploader:    msg.sender,
            isSealed:    false,
            status:      EvidenceStatus.Active
        });

        hashToId[fileHash] = evidenceId;
        uploaderEvidence[msg.sender].push(evidenceId);
        allEvidenceIds.push(evidenceId);
        totalEvidence++;

        // Initial audit log
        auditLogs[evidenceId].push(AuditLog({
            actor:     msg.sender,
            action:    "EVIDENCE_ADDED",
            timestamp: block.timestamp,
            notes:     "Initial upload"
        }));

        emit EvidenceAdded(evidenceId, fileHash, fileName, caseId, msg.sender, block.timestamp);
        return evidenceId;
    }

    /**
     * @dev Seal evidence — makes it immutable (cannot update status)
     */
    function sealEvidence(bytes32 evidenceId)
        external
        evidenceExists(evidenceId)
        notSealed(evidenceId)
    {
        require(
            msg.sender == evidenceStore[evidenceId].uploader || msg.sender == owner,
            "Not authorized to seal"
        );
        evidenceStore[evidenceId].isSealed = true;

        auditLogs[evidenceId].push(AuditLog({
            actor:     msg.sender,
            action:    "EVIDENCE_SEALED",
            timestamp: block.timestamp,
            notes:     "Evidence sealed for integrity"
        }));

        emit EvidenceSealed(evidenceId, msg.sender);
    }

    /**
     * @dev Update evidence status
     */
    function updateStatus(bytes32 evidenceId, EvidenceStatus newStatus, string memory notes)
        external
        evidenceExists(evidenceId)
        notSealed(evidenceId)
    {
        require(
            msg.sender == evidenceStore[evidenceId].uploader || msg.sender == owner,
            "Not authorized"
        );

        evidenceStore[evidenceId].status = newStatus;

        auditLogs[evidenceId].push(AuditLog({
            actor:     msg.sender,
            action:    "STATUS_UPDATED",
            timestamp: block.timestamp,
            notes:     notes
        }));

        emit EvidenceStatusUpdated(evidenceId, newStatus, msg.sender);
    }

    /**
     * @dev Log a custom audit action
     */
    function logAudit(bytes32 evidenceId, string memory action, string memory notes)
        external
        evidenceExists(evidenceId)
    {
        auditLogs[evidenceId].push(AuditLog({
            actor:     msg.sender,
            action:    action,
            timestamp: block.timestamp,
            notes:     notes
        }));

        emit EvidenceAuditLogged(evidenceId, msg.sender, action);
    }

    // ─────────────────────────────────────────────
    //  Verification Functions
    // ─────────────────────────────────────────────

    /**
     * @dev Verify a file hash — returns true if registered and active
     */
    function verifyEvidence(string memory fileHash)
        external
        view
        returns (bool isValid, bytes32 evidenceId, address uploader, uint256 timestamp)
    {
        evidenceId = hashToId[fileHash];
        if (evidenceId == bytes32(0)) {
            return (false, bytes32(0), address(0), 0);
        }
        Evidence memory e = evidenceStore[evidenceId];
        return (true, evidenceId, e.uploader, e.timestamp);
    }

    // ─────────────────────────────────────────────
    //  Getters
    // ─────────────────────────────────────────────

    function getEvidence(bytes32 evidenceId)
        external
        view
        evidenceExists(evidenceId)
        returns (Evidence memory)
    {
        return evidenceStore[evidenceId];
    }

    function getEvidenceByHash(string memory fileHash)
        external
        view
        returns (Evidence memory)
    {
        bytes32 evidenceId = hashToId[fileHash];
        require(evidenceId != bytes32(0), "Evidence not found");
        return evidenceStore[evidenceId];
    }

    function getAuditLogs(bytes32 evidenceId)
        external
        view
        evidenceExists(evidenceId)
        returns (AuditLog[] memory)
    {
        return auditLogs[evidenceId];
    }

    function getUploaderEvidence(address uploader)
        external
        view
        returns (bytes32[] memory)
    {
        return uploaderEvidence[uploader];
    }

    function getAllEvidenceIds()
        external
        view
        returns (bytes32[] memory)
    {
        return allEvidenceIds;
    }

    function getEvidenceCount() external view returns (uint256) {
        return totalEvidence;
    }
}
