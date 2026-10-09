"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Award,
  Wallet,
  Search,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Lock,
  FileBadge,
  Eye,
  Send,
} from "lucide-react";

type RoleTab = "issuer" | "wallet" | "verifier" | "audit";

export default function PortalPage() {
  const [activeTab, setActiveTab] = useState<RoleTab>("issuer");

  // State Penerbitan (Issuer)
  const [issuerData, setIssuerData] = useState({
    issuerId: "did:web:uis.ac.id",
    issuerName: "Universitas Indonesia Sintetis",
    studentIdentifier: "MHS-SYNTH-2026-001",
    fullName: "Budi Santoso Sintetis",
    degreeName: "Sarjana Komputer (S.Kom.)",
    studyProgram: "Teknik Informatika",
    faculty: "Fakultas Ilmu Komputer",
    gpa: "3.85",
    graduationDate: "2026-08-15",
    validUntil: "2036-08-20T23:59:59Z",
  });

  const [issuedCredential, setIssuedCredential] = useState<any>(null);
  const [issueTxInfo, setIssueTxInfo] = useState<any>(null);
  const [isIssuing, setIsIssuing] = useState(false);

  // State Dompet (Holder Wallet)
  const [walletCredentials, setWalletCredentials] = useState<any[]>([]);
  const [selectedVc, setSelectedVc] = useState<any>(null);
  const [createdPresentation, setCreatedPresentation] = useState<any>(null);

  // State Verifikasi (Verifier)
  const [verifierRequest, setVerifierRequest] = useState<any>({
    requestId: "REQ-SYNTH-2026-001",
    purpose: "Verifikasi Kualifikasi Lamaran Software Engineer",
    audience: "https://techcorp-synthetic.id/verify-callback",
    nonce: "nonce-" + Math.random().toString(36).substring(2, 10),
    requestedAttributes: ["fullName", "degreeName", "studyProgram", "gpa"],
  });
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // State Audit & Lifecycle
  const [auditCredentialId, setAuditCredentialId] = useState("");
  const [credentialStatus, setCredentialStatus] = useState<string>("ACTIVE");
  const [auditEvents, setAuditEvents] = useState<any[]>([
    {
      action: "CredentialIssued",
      oldStatus: "NONE",
      newStatus: "ACTIVE",
      reasonRef: "Penerbitan Ijazah Resmi",
      timestamp: "2026-08-20T01:00:00Z",
      txHash: "0x647bbca44376cfa9eaebf31a295c52c67fe997ad9cb443210fc977e53f191b4b",
    },
  ]);

  // Handler Muat Data Sintetis SCN-VALID-01
  const handleLoadSyntheticValid = () => {
    setIssuerData({
      issuerId: "did:web:uis.ac.id",
      issuerName: "Universitas Indonesia Sintetis",
      studentIdentifier: "MHS-SYNTH-2026-001",
      fullName: "Budi Santoso Sintetis",
      degreeName: "Sarjana Komputer (S.Kom.)",
      studyProgram: "Teknik Informatika",
      faculty: "Fakultas Ilmu Komputer",
      gpa: "3.85",
      graduationDate: "2026-08-15",
      validUntil: "2036-08-20T23:59:59Z",
    });
  };

  // Handler Terbitkan Kredensial (Simulasi API & Blockchain)
  const handleIssueCredential = () => {
    setIsIssuing(true);
    setTimeout(() => {
      const credId = `urn:credential:academic:uis-s1-2026-${Math.floor(Math.random() * 900 + 100)}`;
      const dummyTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      const dummyCommitment = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

      const vc = {
        "@context": [
          "https://www.w3.org/ns/credentials/v2",
          "https://example.edu/schemas/academic-v2",
        ],
        id: credId,
        type: ["VerifiableCredential", "AcademicDegreeCredential"],
        issuer: {
          id: issuerData.issuerId,
          name: issuerData.issuerName,
          ethereumAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        },
        validFrom: new Date().toISOString(),
        validUntil: issuerData.validUntil,
        credentialSubject: {
          id: "did:key:z6Mksynth1234567890holder1",
          studentIdentifier: issuerData.studentIdentifier,
          fullName: issuerData.fullName,
          degreeName: issuerData.degreeName,
          studyProgram: issuerData.studyProgram,
          faculty: issuerData.faculty,
          gpa: issuerData.gpa,
          graduationDate: issuerData.graduationDate,
        },
        credentialStatus: {
          id: `${credId}#status`,
          type: "EthereumCredentialRegistry2026",
          registryAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          credentialIdOnChain: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
        },
        proof: {
          type: "EthereumEcdsaSignature2026",
          created: new Date().toISOString(),
          verificationMethod: `${issuerData.issuerId}#key-1`,
          proofPurpose: "assertionMethod",
          proofValue: "0x8fa4c391295b9b...canonical_ecdsa_signature_valid",
        },
      };

      setIssuedCredential(vc);
      setIssueTxInfo({
        txHash: dummyTx,
        blockNumber: 1042,
        commitment: dummyCommitment,
      });

      // Simpan ke Wallet secara otomatis
      setWalletCredentials((prev) => [vc, ...prev]);
      setSelectedVc(vc);
      setAuditCredentialId(credId);
      setIsIssuing(false);
    }, 800);
  };

  // Handler Generate Verifiable Presentation (Holder)
  const handleGeneratePresentation = () => {
    if (!selectedVc) return;
    const vp = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiablePresentation"],
      verifiableCredential: [selectedVc],
      presentationSubmission: {
        requestId: verifierRequest.requestId,
        audience: verifierRequest.audience,
        nonce: verifierRequest.nonce,
      },
    };
    setCreatedPresentation(vp);
  };

  // Handler Verifikasi (Verifier)
  const handleVerifyCredential = (tamperType?: "none" | "tamper_gpa" | "replay_nonce") => {
    setIsVerifying(true);
    setTimeout(() => {
      if (tamperType === "tamper_gpa") {
        setVerificationResult({
          isValid: false,
          status: "TAMPERED",
          reasons: [
            "DATA_DIPALSUKAN: Hash komitmen off-chain (keccak256) tidak cocok dengan jangkar on-chain",
          ],
          checks: {
            structure: true,
            signature: false,
            issuerRegistered: true,
            onChainStatus: true,
            integrityCommitment: false,
            validityPeriod: true,
          },
        });
      } else if (tamperType === "replay_nonce") {
        setVerificationResult({
          isValid: false,
          status: "REJECTED",
          reasons: [
            "REPLAY_ATTACK_DETECTED: Nonce telah digunakan sebelumnya (one-time nonce violation)",
          ],
          checks: {
            nonceValid: false,
            audienceValid: true,
            requestNotExpired: true,
            credentialsValid: true,
            requiredAttributesSupplied: true,
          },
        });
      } else {
        // Valid
        setVerificationResult({
          isValid: credentialStatus === "ACTIVE",
          status: credentialStatus,
          reasons:
            credentialStatus === "ACTIVE"
              ? []
              : [`Status kredensial on-chain saat ini bernilai ${credentialStatus}`],
          checks: {
            structure: true,
            signature: true,
            issuerRegistered: true,
            onChainStatus: credentialStatus === "ACTIVE",
            integrityCommitment: true,
            validityPeriod: true,
          },
        });
      }
      setIsVerifying(false);
    }, 600);
  };

  // Handler Lifecycle (Suspend, Reactivate, Revoke)
  const handleUpdateStatus = (newStatus: "ACTIVE" | "SUSPENDED" | "REVOKED", reason: string) => {
    const oldStatus = credentialStatus;
    setCredentialStatus(newStatus);
    const newEvent = {
      action: "CredentialStatusChanged",
      oldStatus,
      newStatus,
      reasonRef: reason,
      timestamp: new Date().toISOString(),
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
    };
    setAuditEvents((prev) => [newEvent, ...prev]);
  };

  return (
    <div className="container">
      {/* Header Bar */}
      <header className="header">
        <div className="brand-wrapper">
          <div className="brand-badge">🎓</div>
          <div>
            <h1 className="brand-title">Academic Credential Blockchain Portal</h1>
            <p className="brand-subtitle">
              Sistem Verifikasi Ijazah Berbasis W3C Verifiable Credentials & Hyperledger/EVM Registry
            </p>
          </div>
        </div>
        <div className="node-status-pill">
          <div className="status-dot"></div>
          <span>EVM Local Node (31337) • Connected</span>
        </div>
      </header>

      {/* Role Navigation Tabs */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "issuer" ? "active" : ""}`}
          onClick={() => setActiveTab("issuer")}
        >
          <Award size={18} />
          1. Issuer Portal
        </button>
        <button
          className={`tab-btn ${activeTab === "wallet" ? "active" : ""}`}
          onClick={() => setActiveTab("wallet")}
        >
          <Wallet size={18} />
          2. Holder Wallet
        </button>
        <button
          className={`tab-btn ${activeTab === "verifier" ? "active" : ""}`}
          onClick={() => setActiveTab("verifier")}
        >
          <Search size={18} />
          3. Verifier Portal
        </button>
        <button
          className={`tab-btn ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          <History size={18} />
          4. Audit & Lifecycle
        </button>
      </nav>

      {/* TAB 1: ISSUER PORTAL */}
      {activeTab === "issuer" && (
        <div className="glass-card">
          <div className="card-title">
            <Award size={22} color="#38bdf8" />
            Penerbitan Kredensial Akademik & Anchoring On-Chain
          </div>
          <p className="card-desc">
            Institusi pendidikan terdaftar menandatangani data akademik (off-chain) dan mencatat komitmen integritas ke smart contract registry.
          </p>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Institusi Penerbit (Issuer)</label>
              <input
                className="form-input"
                value={issuerData.issuerName}
                onChange={(e) => setIssuerData({ ...issuerData, issuerName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Issuer DID</label>
              <input
                className="form-input"
                value={issuerData.issuerId}
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nomor Induk Mahasiswa (NIM)</label>
              <input
                className="form-input"
                value={issuerData.studentIdentifier}
                onChange={(e) => setIssuerData({ ...issuerData, studentIdentifier: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nama Lengkap Mahasiswa</label>
              <input
                className="form-input"
                value={issuerData.fullName}
                onChange={(e) => setIssuerData({ ...issuerData, fullName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gelar Akademik</label>
              <input
                className="form-input"
                value={issuerData.degreeName}
                onChange={(e) => setIssuerData({ ...issuerData, degreeName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Program Studi</label>
              <input
                className="form-input"
                value={issuerData.studyProgram}
                onChange={(e) => setIssuerData({ ...issuerData, studyProgram: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Indeks Prestasi Kumulatif (IPK)</label>
              <input
                className="form-input"
                value={issuerData.gpa}
                onChange={(e) => setIssuerData({ ...issuerData, gpa: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal Kelulusan</label>
              <input
                className="form-input"
                type="date"
                value={issuerData.graduationDate}
                onChange={(e) => setIssuerData({ ...issuerData, graduationDate: e.target.value })}
              />
            </div>
          </div>

          <div className="btn-group">
            <button className="btn btn-primary" onClick={handleIssueCredential} disabled={isIssuing}>
              <ShieldCheck size={18} />
              {isIssuing ? "Menandatangani & Anchoring..." : "Terbitkan & Anchor On-Chain"}
            </button>
            <button className="btn btn-secondary" onClick={handleLoadSyntheticValid}>
              <RefreshCw size={16} />
              Muat Fixture SCN-VALID-01
            </button>
          </div>

          {issueTxInfo && (
            <div style={{ marginTop: "1.75rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                <CheckCircle2 size={18} color="#34d399" />
                <strong style={{ color: "#34d399" }}>Kredensial Berhasil Diterbitkan & Di-Anchor ke Blockchain!</strong>
              </div>
              <div className="code-box">
                <div>// Bukti Transaksi On-Chain</div>
                <div>Transaction Hash : {issueTxInfo.txHash}</div>
                <div>Block Number      : #{issueTxInfo.blockNumber}</div>
                <div>Commitment Hash   : {issueTxInfo.commitment}</div>
                <div>Registry Address  : 0x5FbDB2315678afecb367f032d93F642f64180aa3</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HOLDER WALLET */}
      {activeTab === "wallet" && (
        <div className="glass-card">
          <div className="card-title">
            <Wallet size={22} color="#818cf8" />
            Dompet Digital Pemegang (Holder Wallet)
          </div>
          <p className="card-desc">
            Data akademik pribadi tersimpan di sisi klien (off-chain). Pemegang memiliki kendali penuh untuk menyajikan Verifiable Presentation kepada pihak ketiga.
          </p>

          {walletCredentials.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
              <p>Belum ada kredensial di dompet. Silakan terbitkan kredensial terlebih dahulu di tab <strong>Issuer Portal</strong>.</p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "#e2e8f0" }}>
                  Kredensial Tersimpan ({walletCredentials.length})
                </h4>
                {walletCredentials.map((vc, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: selectedVc?.id === vc.id ? "rgba(56, 189, 248, 0.1)" : "rgba(255, 255, 255, 0.02)",
                      border: selectedVc?.id === vc.id ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                      borderRadius: "14px",
                      padding: "1.25rem",
                      marginBottom: "1rem",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedVc(vc)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{vc.credentialSubject.degreeName}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          {vc.credentialSubject.fullName} • {vc.credentialSubject.studentIdentifier} • {vc.issuer.name}
                        </div>
                      </div>
                      <span className={`status-badge ${credentialStatus}`}>{credentialStatus}</span>
                    </div>
                  </div>
                ))}
              </div>

              {selectedVc && (
                <div>
                  <h4 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "#e2e8f0" }}>
                    Rincian Dokumen W3C Verifiable Credential
                  </h4>
                  <div className="code-box">
                    {JSON.stringify(selectedVc, null, 2)}
                  </div>

                  <div className="btn-group" style={{ marginTop: "1.25rem" }}>
                    <button className="btn btn-primary" onClick={handleGeneratePresentation}>
                      <Send size={16} />
                      Buat Verifiable Presentation (VP) untuk Verifier
                    </button>
                  </div>
                </div>
              )}

              {createdPresentation && (
                <div style={{ marginTop: "1.5rem" }}>
                  <h4 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "#34d399" }}>
                    Verifiable Presentation Siap Dikirim:
                  </h4>
                  <div className="code-box">
                    {JSON.stringify(createdPresentation, null, 2)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VERIFIER PORTAL */}
      {activeTab === "verifier" && (
        <div className="glass-card">
          <div className="card-title">
            <Search size={22} color="#34d399" />
            Portal Verifikasi (Verifier)
          </div>
          <p className="card-desc">
            Pemeriksaan 6-lapis: Format W3C, Tanda Tangan ECDSA Issuer, Otorisasi Institusi On-Chain, Validitas Komitmen Integritas, Status Siklus Hidup, dan Pencegahan Replay Nonce.
          </p>

          <div style={{ background: "rgba(255,255,255,0.02)", padding: "1.25rem", borderRadius: "14px", border: "1px solid var(--border-color)", marginBottom: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Target Verifier:</span>
                <div style={{ fontWeight: 600 }}>PT Teknologi Maju Sintetis</div>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Challenge Nonce:</span>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--primary)" }}>{verifierRequest.nonce}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Klaim yang Diminta:</span>
                <div style={{ fontSize: "0.85rem" }}>Nama, Gelar, Program Studi, IPK</div>
              </div>
            </div>
          </div>

          <div className="btn-group">
            <button className="btn btn-primary" onClick={() => handleVerifyCredential("none")} disabled={isVerifying}>
              <ShieldCheck size={18} />
              {isVerifying ? "Memverifikasi..." : "Jalankan Verifikasi Sah (Normal)"}
            </button>
            <button className="btn btn-warning" onClick={() => handleVerifyCredential("tamper_gpa")} disabled={isVerifying}>
              <AlertTriangle size={16} />
              Simulasi Pemalsuan GPA (AT-03)
            </button>
            <button className="btn btn-danger" onClick={() => handleVerifyCredential("replay_nonce")} disabled={isVerifying}>
              <RefreshCw size={16} />
              Simulasi Replay Attack (AT-08)
            </button>
          </div>

          {verificationResult && (
            <div style={{ marginTop: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "1rem 1.25rem",
                  borderRadius: "14px",
                  background: verificationResult.isValid ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  border: verificationResult.isValid ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(239, 68, 68, 0.4)",
                  marginBottom: "1.5rem",
                }}
              >
                {verificationResult.isValid ? (
                  <CheckCircle2 size={24} color="#34d399" />
                ) : (
                  <XCircle size={24} color="#f87171" />
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: verificationResult.isValid ? "#34d399" : "#f87171" }}>
                    {verificationResult.isValid ? "VERIFIKASI BERHASIL: KREDENSIAL SAH & AKTIF" : `VERIFIKASI DITOLAK: ${verificationResult.status}`}
                  </div>
                  {verificationResult.reasons.length > 0 && (
                    <div style={{ fontSize: "0.85rem", color: "#fca5a5", marginTop: "0.25rem" }}>
                      {verificationResult.reasons.join(" • ")}
                    </div>
                  )}
                </div>
              </div>

              <h4 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "#e2e8f0" }}>
                Pemeriksaan Rinci 6-Lapisan:
              </h4>
              <div className="checks-grid">
                <div className="check-item">
                  <span>Struktur & Format W3C</span>
                  <span className={verificationResult.checks.structure ? "check-status-pass" : "check-status-fail"}>
                    {verificationResult.checks.structure ? "✓ VALID" : "✗ GAGAL"}
                  </span>
                </div>
                <div className="check-item">
                  <span>Tanda Tangan Digital ECDSA</span>
                  <span className={verificationResult.checks.signature ? "check-status-pass" : "check-status-fail"}>
                    {verificationResult.checks.signature ? "✓ SAH" : "✗ TIDAK COCOK"}
                  </span>
                </div>
                <div className="check-item">
                  <span>Registrasi Issuer On-Chain</span>
                  <span className={verificationResult.checks.issuerRegistered ? "check-status-pass" : "check-status-fail"}>
                    {verificationResult.checks.issuerRegistered ? "✓ TERDAFTAR" : "✗ TIDAK DIKENAL"}
                  </span>
                </div>
                <div className="check-item">
                  <span>Komitmen Integritas (Anti-Tamper)</span>
                  <span className={verificationResult.checks.integrityCommitment ? "check-status-pass" : "check-status-fail"}>
                    {verificationResult.checks.integrityCommitment ? "✓ UTUH" : "✗ DIPALSUKAN"}
                  </span>
                </div>
                <div className="check-item">
                  <span>Status Siklus Hidup On-Chain</span>
                  <span className={verificationResult.checks.onChainStatus ? "check-status-pass" : "check-status-fail"}>
                    {verificationResult.checks.onChainStatus ? "✓ ACTIVE" : "✗ NON-ACTIVE"}
                  </span>
                </div>
                <div className="check-item">
                  <span>Masa Berlaku (Expiry Window)</span>
                  <span className={verificationResult.checks.validityPeriod ? "check-status-pass" : "check-status-fail"}>
                    {verificationResult.checks.validityPeriod ? "✓ AKTIF" : "✗ KEDALUWARSA"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT & LIFECYCLE */}
      {activeTab === "audit" && (
        <div className="glass-card">
          <div className="card-title">
            <History size={22} color="#c084fc" />
            Manajemen Siklus Hidup & Jejak Audit On-Chain
          </div>
          <p className="card-desc">
            Pengelolaan state machine kredensial (ACTIVE, SUSPENDED, REVOKED) dan penelusuran riwayat kejadian on-chain yang transparan.
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "1.25rem", borderRadius: "14px", border: "1px solid var(--border-color)", marginBottom: "1.5rem" }}>
            <div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Status Kredensial Saat Ini:</span>
              <div style={{ marginTop: "0.25rem" }}>
                <span className={`status-badge ${credentialStatus}`}>{credentialStatus}</span>
              </div>
            </div>
            <div className="btn-group">
              {credentialStatus === "ACTIVE" && (
                <button
                  className="btn btn-warning"
                  onClick={() => handleUpdateStatus("SUSPENDED", "Penangguhan sementara untuk pemeriksaan etika")}
                >
                  <AlertTriangle size={16} />
                  Tangguhkan (Suspend)
                </button>
              )}
              {credentialStatus === "SUSPENDED" && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleUpdateStatus("ACTIVE", "Pemeriksaan selesai, kredensial direaktivasi")}
                >
                  <RefreshCw size={16} />
                  Reaktivasi (Reactivate)
                </button>
              )}
              {credentialStatus !== "REVOKED" && (
                <button
                  className="btn btn-danger"
                  onClick={() => handleUpdateStatus("REVOKED", "Pencabutan permanen atas dasar pelanggaran integritas akademik")}
                >
                  <XCircle size={16} />
                  Cabut Permanen (Revoke)
                </button>
              )}
              {credentialStatus === "REVOKED" && (
                <span style={{ color: "#f87171", fontSize: "0.85rem", fontWeight: 600 }}>
                  Kredensial berstatus terminal (REVOKED). Tidak dapat diaktifkan kembali.
                </span>
              )}
            </div>
          </div>

          <h4 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#e2e8f0" }}>
            Kronologi Jejak Audit (On-Chain Events Log)
          </h4>
          <div className="timeline">
            {auditEvents.map((ev, idx) => (
              <div key={idx} className="timeline-item">
                <div className="timeline-node"></div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <div>
                      <strong style={{ color: "#38bdf8" }}>{ev.action}</strong>
                      <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                        ({ev.oldStatus} &rarr; {ev.newStatus})
                      </span>
                    </div>
                    <span className="timeline-meta">{ev.timestamp}</span>
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                    Alasan: {ev.reasonRef}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    TxHash: {ev.txHash}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
