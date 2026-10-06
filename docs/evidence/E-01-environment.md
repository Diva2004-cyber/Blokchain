# Evidensi E-01: Verifikasi Environment & Reproducibility Baseline

## 1. Metadata Pengujian
* **Timestamp**: 2026-10-06T08:31:00+07:00
* **Milestone**: M0 (Environment Setup) & M1 (Repo + Schema Baseline)
* **Status**: PASS / VERIFIED
* **Pelaksana**: AI Coding Agent (Antigravity IDE)

---

## 2. Rincian Lingkungan Sistem (Host Environment)

| Komponen | Versi Terdeteksi | Status Kompatibilitas |
| :--- | :--- | :--- |
| **Sistem Operasi** | Windows (PowerShell Shell) | Sesuai PRD |
| **Node.js Runtime** | `v22.15.1` (Active LTS) | Terverifikasi kompatibel (lihat ADR-001) |
| **Package Manager** | `npm v11.13.0` | Kompatibel |
| **Version Control** | `git version 2.49.0.windows.1` | Terverifikasi |
| **IDE / Agent Host**| Antigravity IDE | Aktif |

---

## 3. Log Eksekusi Perintah Verifikasi
Perintah yang dijalankan pada host:
```powershell
node -v; npm -v; git --version
```
Hasil luaran:
```text
v22.15.1
11.13.0
git version 2.49.0.windows.1
```

---

## 4. Verifikasi Struktur Repositori (Milestone M1)
Direktori yang terverifikasi telah dibuat sesuai PRD Bab 17:
* `apps/portal` & `apps/api`
* `contracts/` & `contracts/interfaces/`
* `blockchain/scripts/` & `blockchain/test/`
* `network/besu-qbft/`
* `data/synthetic/`
* `tests/security/`, `tests/integration/`, `tests/performance/`
* `docs/architecture/`, `docs/adr/`, `docs/evidence/`
* `scripts/`

Berkas konfigurasi dan skema yang telah tersedia:
* `.gitignore` (Mencegah kebocoran rahasia / node_modules)
* `.env.example` (Konfigurasi lokal tanpa rahasia riil)
* `package.json` & `tsconfig.json`
* `hardhat.config.ts` & `blockchain/hardhat.config.ts`
* `data/synthetic/credential_schema.json`
* `data/synthetic/academic_credentials_fixtures.json`
* `data/synthetic/issuers_fixtures.json`
* `data/synthetic/verifier_requests_fixtures.json`
* `docs/architecture/vc_data_model.md`
* `docs/adr/ADR-001-environment-and-node-baseline.md`
