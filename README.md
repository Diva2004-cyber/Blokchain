# Prototype Sistem Verifikasi Kredensial Akademik Berbasis Blockchain

> **UTS Blockchain OBE — Project-Based (T.A. 2026/2027)**  
> **Source of Truth**: [`PRD_Prototype_Verifikasi_Kredensial_Akademik_AI_Agents.md`](./PRD_Prototype_Verifikasi_Kredensial_Akademik_AI_Agents.md)  
> **Naskah Laporan Akhir (P1 s/d P6)**: [`docs/report/LAPORAN_UTS_BLOCKCHAIN_OBE.md`](./docs/report/LAPORAN_UTS_BLOCKCHAIN_OBE.md)  
> **Status**: Full Implementation & Verified (M0 s/d M9 DONE)

---

## 1. Ringkasan Proyek
Prototipe ini mengimplementasikan sistem verifikasi kredensial akademik (ijazah/sertifikat) berbasis standar **W3C Verifiable Credentials (VC) Data Model v2.0** dan smart contract pada jaringan blockchain permissioned (EVM local / Hyperledger Besu QBFT).

Sistem memisahkan secara ketat:
* **Off-Chain Storage**: Menyimpan data akademik lengkap (PII) di dompet digital pemegang (*Holder Wallet*).
* **On-Chain Registry**: Mencatat komitmen kriptografis (hash keccak256), identifier kredensial, issuer resmi, dan status siklus hidup (`ACTIVE`, `SUSPENDED`, `REVOKED`).

---

## 2. Struktur Repositori (Monorepo)

```text
academic-credential-blockchain/
├─ apps/
│  ├─ portal/                 # React/Next.js Portal (Issuer, Wallet, Verifier, Audit)
│  └─ api/                    # Node/TypeScript Backend API Service
├─ contracts/
│  ├─ CredentialRegistry.sol  # Smart contract registry Solidity 0.8.30
│  └─ interfaces/
├─ blockchain/
│  ├─ hardhat.config.ts       # Konfigurasi Hardhat
│  ├─ scripts/                # Script deployment dan automasi lokal
│  └─ test/                   # Test suite smart contract
├─ network/
│  └─ besu-qbft/              # Konfigurasi simulasi konsorsium Hyperledger Besu
├─ data/
│  └─ synthetic/              # Skema W3C VC & dataset sintetis 100% dummy
├─ tests/
│  ├─ security/               # Pengujian negatif keamanan (AT-03 s/d AT-09)
│  ├─ integration/            # Pengujian integrasi API -> Contract
│  └─ performance/            # Benchmark latensi dan throughput lokal
├─ docs/
│  ├─ architecture/           # Dokumen arsitektur & VC data model
│  ├─ adr/                    # Architectural Decision Records (ADR)
│  └─ evidence/               # Bukti pengujian reproduktif (E-01 s/d E-10)
├─ scripts/                   # Utilitas developer
├─ .env.example               # Contoh konfigurasi lokal
├─ .gitignore                 # Proteksi secret & artifact build
├─ package.json               # Root npm workspace
└─ README.md
```

---

## 3. Prasyarat Lingkungan
* **Sistem Operasi**: Windows 10/11
* **Node.js**: v22.15.1 LTS (atau v24 LTS)
* **npm**: v11.x+
* **Git**: v2.49+

---

## 4. Panduan Eksekusi & Pengujian

### 4.1 Instalasi Dependensi
```bash
npm install
```

### 4.2 Kompilasi Kontrak
```bash
npm run build
# atau
npx hardhat compile
```

### 4.3 Menjalankan Unit & Invariant Test
```bash
npm test
```

### 4.4 Menjalankan Security Negative Tests
```bash
npm run test:security
```

### 4.5 Menjalankan Pengujian Integrasi Penerbitan (M3)
```bash
npm run test:issuance
```

### 4.6 Menjalankan Pengujian Integrasi Verifikasi (M4)
```bash
npm run test:verification
```

### 4.7 Menjalankan Pengujian Integrasi Siklus Hidup (M5)
```bash
npm run test:lifecycle
```

### 4.8 Menjalankan Acceptance & Negative Tests (AT-01 s/d AT-10)
```bash
npm run test:acceptance
```

### 4.9 Menjalankan Pemindaian Kebocoran Rahasia (Secret Scan)
```bash
npm run scan:secrets
```

### 4.10 Menjalankan Benchmark Kinerja (M8)
```bash
npm run benchmark
```

### 4.11 Menjalankan Simulasi Konsorsium Besu QBFT (M9)
```bash
npm run simulate:consortium
```

### 4.12 Menjalankan Seluruh Rangkaian Pengujian (All Tests)
```bash
npm run test:all
```

---

## 5. Status Milestone Implementasi

| Milestone | Deskripsi | Status | Evidensi |
| :--- | :--- | :---: | :--- |
| **M0** | Setup Environment & Tooling | ✅ **DONE** | [`docs/evidence/E-01-environment.md`](./docs/evidence/E-01-environment.md) |
| **M1** | Repo Structure, VC Schema & Synthetic Dataset | ✅ **DONE** | [`data/synthetic/`](./data/synthetic/) |
| **M2** | Smart Contract `CredentialRegistry.sol` & Tests | ✅ **DONE** | [`docs/evidence/E-02-contract.md`](./docs/evidence/E-02-contract.md) |
| **M3** | Issuance & Commitment Anchoring Flow | ✅ **DONE** | [`docs/evidence/E-03-issuance.md`](./docs/evidence/E-03-issuance.md) |
| **M4** | Verification Flow (Signature, Status, Expiry, Nonce) | ✅ **DONE** | [`docs/evidence/E-04-verification.md`](./docs/evidence/E-04-verification.md) |
| **M5** | Lifecycle State Machine (Suspend/Reactivate/Revoke) | ✅ **DONE** | [`docs/evidence/E-05-lifecycle.md`](./docs/evidence/E-05-lifecycle.md) |
| **M6** | Portal UI (Issuer, Wallet, Verifier, Audit) | ✅ **DONE** | [`docs/evidence/E-06-portal.md`](./docs/evidence/E-06-portal.md) |
| **M7** | Security QA & Acceptance Tests (AT-01 s/d AT-10) | ✅ **DONE** | [`docs/evidence/E-07-security-qa.md`](./docs/evidence/E-07-security-qa.md) |
| **M8** | Performance Benchmark & Evidence Package | ✅ **DONE** | [`docs/evidence/E-08-performance.md`](./docs/evidence/E-08-performance.md) |
| **M9** | Simulasi Konsorsium Besu QBFT | ✅ **DONE** | [`docs/evidence/E-10-besu-consortium.md`](./docs/evidence/E-10-besu-consortium.md) |

