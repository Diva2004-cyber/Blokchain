# ADR-001: Baseline Environment, Monorepo Structure, dan Pilihan Runtime

## Status
Diterima (*Accepted*) - 6 Oktober 2026

## Konteks
PRD Bab 6 dan Bab 17 menetapkan arsitektur prototipe sistem verifikasi kredensial akademik berbasis blockchain. Proyek ini dijalankan pada workstation Windows 10/11 dengan Antigravity IDE, dan membutuhkan fondasi dependensi yang deterministik, terisolasi, serta dapat direproduksi (*reproducible*).

Dalam inspeksi M0, terdeteksi:
* Node.js host: `v22.15.1` (Active LTS)
* npm host: `11.13.0`
* Git host: `2.49.0.windows.1`
* PRD menyebutkan rujukan baseline Node.js `24.19.0 LTS`.

## Keputusan
1. **Adopsi Node.js 22.15.1 LTS**:
   * Node.js v22.15.1 mendukung seluruh fitur ES2022+, modul TypeScript modern, kompatibilitas penuh dengan Hardhat, ethers.js v6, Next.js 15, dan express.
   * Tidak diperlukan upgrade ke Node.js 24 karena Node 22 merupakan LTS stabil yang memenuhi semua persyaratan fungsional tanpa memicu isu kompatibilitas biner pada modul native Windows.
2. **Struktur Repositori Monorepo**:
   * Menggunakan npm workspaces untuk mengelola aplikasi (`apps/portal`, `apps/api`) dan kontrak blockchain (`blockchain/`, `contracts/`).
   * Seluruh dependensi smart contract dan tooling testing dikonsolidasikan pada root level untuk kemudahan eksekusi Hardhat dan CI/CD lokal.
3. **Penyimpanan Off-Chain vs On-Chain**:
   * Data PII (mahasiswa, ijazah mentah) diisolasi dalam berkas sintetis lokal (`data/synthetic/`).
   * Smart contract hanya memuat hash komitmen dan registry status.
4. **Keamanan Kunci**:
   * Menggunakan Hardhat deterministic mnemonic/private keys untuk pengujian lokal.
   * File `.env.example` disediakan; berkas `.env` dan segala format kunci rahasia dimasukkan dalam `.gitignore`.

## Konsekuensi
* Proyek dapat dibangun secara seragam dan deterministik tanpa memerlukan instalasi eksternal berbayar.
* Penilaian pengujian (AT-01 s/d AT-10) dapat dijalankan langsung melalui script pengujian otomatis.
