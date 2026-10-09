// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/ICredentialRegistry.sol";

/**
 * @title CredentialRegistry
 * @notice Implementasi Smart Contract Registry Status dan Komitmen Kredensial Akademik
 * @dev Memenuhi PRD UTS Blockchain OBE 2026/2027 Section 8, 9, 13
 */
contract CredentialRegistry is ICredentialRegistry {
    // Tata kelola (Governance Admin)
    address public admin;

    // Mapping issuerId (string) -> data Issuer
    mapping(string => Issuer) private _issuers;

    // Mapping address -> issuerId (string) untuk verifikasi pengirim transaksi
    mapping(address => string) private _addressToIssuerId;

    // Mapping credentialId (bytes32) -> data CredentialRecord
    mapping(bytes32 => CredentialRecord) private _credentials;

    // Modifier untuk Governance Admin
    modifier onlyAdmin() {
        if (msg.sender != admin) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    // Modifier untuk Issuer resmi atau Admin
    modifier onlyAuthorizedIssuer(string calldata issuerId) {
        Issuer memory issuer = _issuers[issuerId];
        if (bytes(issuer.issuerId).length == 0) {
            revert IssuerNotFound(issuerId);
        }
        if (!issuer.active) {
            revert IssuerInactive(issuerId);
        }
        if (msg.sender != issuer.issuerAddress && msg.sender != admin) {
            revert UnauthorizedCaller(msg.sender);
        }
        _;
    }

    /**
     * @notice Inisialisasi kontrak dengan deployer sebagai Governance Admin
     */
    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Mengubah administrator tata kelola
     * @param newAdmin Alamat administrator baru
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) {
            revert InvalidAddress();
        }
        admin = newAdmin;
    }

    /**
     * @notice Mendaftarkan institusi penerbit (Issuer) baru oleh Admin
     * @param issuerId Identifier unik institusi (misal: "did:web:uis.ac.id")
     * @param issuerAddress Alamat Ethereum yang diberi wewenang menandatangani transaksi
     * @param verificationMethod Referensi kunci publik untuk verifikasi tanda tangan
     */
    function registerIssuer(
        string calldata issuerId,
        address issuerAddress,
        string calldata verificationMethod
    ) public override onlyAdmin {
        if (bytes(issuerId).length == 0) {
            revert InvalidIdentifier();
        }
        if (issuerAddress == address(0)) {
            revert InvalidAddress();
        }
        if (bytes(verificationMethod).length == 0) {
            revert InvalidIdentifier();
        }
        if (bytes(_issuers[issuerId].issuerId).length != 0) {
            revert IssuerAlreadyRegistered(issuerId);
        }

        _issuers[issuerId] = Issuer({
            issuerId: issuerId,
            issuerAddress: issuerAddress,
            verificationMethod: verificationMethod,
            active: true,
            registeredAt: block.timestamp
        });

        _addressToIssuerId[issuerAddress] = issuerId;

        emit IssuerRegistered(issuerId, issuerAddress, verificationMethod, block.timestamp);
    }

    /**
     * @notice Mendaftarkan issuer baru dengan issuerAddress = msg.sender
     */
    function registerIssuer(
        string calldata issuerId,
        string calldata verificationMethod
    ) external override onlyAdmin {
        registerIssuer(issuerId, msg.sender, verificationMethod);
    }

    /**
     * @notice Mengubah status keaktifan issuer (misal: de-otorisasi kampus bermasalah)
     */
    function setIssuerStatus(string calldata issuerId, bool active) external override onlyAdmin {
        Issuer storage issuer = _issuers[issuerId];
        if (bytes(issuer.issuerId).length == 0) {
            revert IssuerNotFound(issuerId);
        }
        issuer.active = active;
        emit IssuerStatusUpdated(issuerId, active, block.timestamp);
    }

    /**
     * @notice Menerbitkan kredensial dan mencatat komitmen hash integritas di ledger
     * @param credentialId Hash identifier unik kredensial (bytes32)
     * @param issuerId Identifier issuer yang menerbitkan
     * @param commitment Hash keccak256 dari seluruh payload data off-chain
     * @param schemaVersion Versi skema kredensial (misal: 1)
     * @param validUntil Unix timestamp akhir masa berlaku (0 jika tidak ada kadaluarsa)
     */
    function issueCredential(
        bytes32 credentialId,
        string calldata issuerId,
        bytes32 commitment,
        uint32 schemaVersion,
        uint256 validUntil
    ) external override onlyAuthorizedIssuer(issuerId) {
        if (credentialId == bytes32(0)) {
            revert InvalidIdentifier();
        }
        if (commitment == bytes32(0)) {
            revert InvalidCommitment();
        }
        if (_credentials[credentialId].status != Status.NONE) {
            revert CredentialAlreadyExists(credentialId);
        }
        if (validUntil > 0 && validUntil <= block.timestamp) {
            revert InvalidValidityPeriod(validUntil);
        }

        _credentials[credentialId] = CredentialRecord({
            credentialId: credentialId,
            issuerId: issuerId,
            commitment: commitment,
            schemaVersion: schemaVersion,
            validUntil: validUntil,
            issuedAt: block.timestamp,
            updatedAt: block.timestamp,
            status: Status.ACTIVE
        });

        emit CredentialIssued(
            credentialId,
            issuerId,
            commitment,
            schemaVersion,
            validUntil,
            block.timestamp
        );
    }

    /**
     * @notice Menangguhkan sementara kredensial yang sedang aktif
     * @param credentialId ID kredensial
     * @param reasonRef Referensi/alasan penangguhan (misal: investigasi administratif)
     */
    function suspendCredential(
        bytes32 credentialId,
        string calldata reasonRef
    ) external override {
        CredentialRecord storage record = _credentials[credentialId];
        if (record.status == Status.NONE) {
            revert CredentialNotFound(credentialId);
        }
        if (record.status == Status.REVOKED) {
            revert CredentialAlreadyRevoked(credentialId);
        }
        if (record.status != Status.ACTIVE) {
            revert InvalidStateTransition(credentialId, record.status, Status.SUSPENDED);
        }

        // Hanya issuer penerbit atau admin yang berhak mengubah status
        _validateIssuerOrAdmin(record.issuerId);

        record.status = Status.SUSPENDED;
        record.updatedAt = block.timestamp;

        emit CredentialStatusChanged(
            credentialId,
            Status.ACTIVE,
            Status.SUSPENDED,
            reasonRef,
            block.timestamp
        );
    }

    /**
     * @notice Mengaktifkan kembali kredensial yang sebelumnya ditangguhkan
     * @param credentialId ID kredensial
     */
    function reactivateCredential(bytes32 credentialId) external override {
        CredentialRecord storage record = _credentials[credentialId];
        if (record.status == Status.NONE) {
            revert CredentialNotFound(credentialId);
        }
        if (record.status == Status.REVOKED) {
            revert CredentialAlreadyRevoked(credentialId);
        }
        if (record.status != Status.SUSPENDED) {
            revert InvalidStateTransition(credentialId, record.status, Status.ACTIVE);
        }

        _validateIssuerOrAdmin(record.issuerId);

        record.status = Status.ACTIVE;
        record.updatedAt = block.timestamp;

        emit CredentialStatusChanged(
            credentialId,
            Status.SUSPENDED,
            Status.ACTIVE,
            "Reactivated",
            block.timestamp
        );
    }

    /**
     * @notice Mencabut permanen kredensial (Terminal State)
     * @param credentialId ID kredensial
     * @param reasonRef Alasan pencabutan (misal: pemalsuan data, putusan etik)
     */
    function revokeCredential(
        bytes32 credentialId,
        string calldata reasonRef
    ) external override {
        CredentialRecord storage record = _credentials[credentialId];
        if (record.status == Status.NONE) {
            revert CredentialNotFound(credentialId);
        }
        if (record.status == Status.REVOKED) {
            revert CredentialAlreadyRevoked(credentialId);
        }

        _validateIssuerOrAdmin(record.issuerId);

        Status previousStatus = record.status;
        record.status = Status.REVOKED;
        record.updatedAt = block.timestamp;

        emit CredentialStatusChanged(
            credentialId,
            previousStatus,
            Status.REVOKED,
            reasonRef,
            block.timestamp
        );
    }

    /**
     * @notice Mengambil data lengkap rekam jejak kredensial di on-chain
     */
    function getCredential(
        bytes32 credentialId
    ) external view override returns (CredentialRecord memory) {
        CredentialRecord memory record = _credentials[credentialId];
        if (record.status == Status.NONE) {
            revert CredentialNotFound(credentialId);
        }
        return record;
    }

    /**
     * @notice Mengambil informasi profil issuer berdasarkan issuerId
     */
    function getIssuer(
        string calldata issuerId
    ) external view override returns (Issuer memory) {
        Issuer memory issuer = _issuers[issuerId];
        if (bytes(issuer.issuerId).length == 0) {
            revert IssuerNotFound(issuerId);
        }
        return issuer;
    }

    /**
     * @notice Mengambil informasi profil issuer berdasarkan alamat Ethereum
     */
    function getIssuerByAddress(
        address issuerAddress
    ) external view override returns (Issuer memory) {
        string memory id = _addressToIssuerId[issuerAddress];
        if (bytes(id).length == 0) {
            revert IssuerNotFound("Address not registered");
        }
        return _issuers[id];
    }

    /**
     * @notice Fungsi helper cepat untuk memverifikasi apakah kredensial aktif dan belum kedaluwarsa
     */
    function isCredentialValid(bytes32 credentialId) external view override returns (bool) {
        CredentialRecord memory record = _credentials[credentialId];
        if (record.status != Status.ACTIVE) {
            return false;
        }
        if (record.validUntil > 0 && block.timestamp > record.validUntil) {
            return false;
        }
        return true;
    }

    // Helper validasi hak akses issuer atau admin
    function _validateIssuerOrAdmin(string memory issuerId) internal view {
        Issuer memory issuer = _issuers[issuerId];
        if (msg.sender != issuer.issuerAddress && msg.sender != admin) {
            revert UnauthorizedCaller(msg.sender);
        }
    }
}
