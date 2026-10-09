// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ICredentialRegistry
 * @notice Antarmuka standar untuk CredentialRegistry sesuai PRD Section 9.1
 * @dev Mendefinisikan struktur data, enum, event, error, dan metode registry kredensial akademik
 */
interface ICredentialRegistry {
    enum Status {
        NONE,       // 0: Belum diterbitkan
        ACTIVE,     // 1: Kredensial aktif dan sah
        SUSPENDED,  // 2: Ditangguhkan sementara
        REVOKED     // 3: Dicabut permanen (terminal state)
    }

    struct Issuer {
        string issuerId;             // Identifier URN/DID (e.g. "did:web:uis.ac.id")
        address issuerAddress;       // Alamat Ethereum pengendali issuer
        string verificationMethod;   // Referensi kunci publik (e.g. "did:web:uis.ac.id#key-1")
        bool active;                 // Status otorisasi aktif
        uint256 registeredAt;        // Timestamp registrasi
    }

    struct CredentialRecord {
        bytes32 credentialId;        // Identifier unik kredensial (hash atau ID 32-byte)
        string issuerId;             // Referensi ke issuer yang menerbitkan
        bytes32 commitment;          // Hash keccak256 dari payload off-chain (integrity anchor)
        uint32 schemaVersion;        // Versi skema kredensial (e.g. 1)
        uint256 validUntil;          // Masa berlaku unix timestamp (0 jika permanen)
        uint256 issuedAt;            // Timestamp penerbitan
        uint256 updatedAt;           // Timestamp perubahan status terakhir
        Status status;               // Status siklus hidup saat ini
    }

    // Events
    event IssuerRegistered(
        string indexed issuerId,
        address indexed issuerAddress,
        string verificationMethod,
        uint256 timestamp
    );

    event IssuerStatusUpdated(
        string indexed issuerId,
        bool active,
        uint256 timestamp
    );

    event CredentialIssued(
        bytes32 indexed credentialId,
        string indexed issuerId,
        bytes32 commitment,
        uint32 schemaVersion,
        uint256 validUntil,
        uint256 issuedAt
    );

    event CredentialStatusChanged(
        bytes32 indexed credentialId,
        Status oldStatus,
        Status newStatus,
        string reasonRef,
        uint256 updatedAt
    );

    // Custom Errors
    error UnauthorizedCaller(address caller);
    error IssuerAlreadyRegistered(string issuerId);
    error IssuerNotFound(string issuerId);
    error IssuerInactive(string issuerId);
    error InvalidAddress();
    error InvalidIdentifier();
    error InvalidCommitment();
    error CredentialAlreadyExists(bytes32 credentialId);
    error CredentialNotFound(bytes32 credentialId);
    error InvalidStateTransition(bytes32 credentialId, Status currentStatus, Status targetStatus);
    error CredentialAlreadyRevoked(bytes32 credentialId);
    error InvalidValidityPeriod(uint256 validUntil);

    // Functions
    function registerIssuer(
        string calldata issuerId,
        address issuerAddress,
        string calldata verificationMethod
    ) external;

    function registerIssuer(
        string calldata issuerId,
        string calldata verificationMethod
    ) external;

    function setIssuerStatus(string calldata issuerId, bool active) external;

    function issueCredential(
        bytes32 credentialId,
        string calldata issuerId,
        bytes32 commitment,
        uint32 schemaVersion,
        uint256 validUntil
    ) external;

    function suspendCredential(bytes32 credentialId, string calldata reasonRef) external;

    function reactivateCredential(bytes32 credentialId) external;

    function revokeCredential(bytes32 credentialId, string calldata reasonRef) external;

    function getCredential(bytes32 credentialId) external view returns (CredentialRecord memory);

    function getIssuer(string calldata issuerId) external view returns (Issuer memory);

    function getIssuerByAddress(address issuerAddress) external view returns (Issuer memory);

    function isCredentialValid(bytes32 credentialId) external view returns (bool);
}
