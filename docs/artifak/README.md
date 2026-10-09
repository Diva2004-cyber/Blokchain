## MATA KULIAH: BLOCKCHAIN (KODE: KP70067008)
### PROGRAM STUDI INFORMATIKA — FAKULTAS TEKNIK — UNIVERSITAS SILIWANGI
#### Tahun Akademik 2026/2027 Semester Ganjil

---

## 1. Identitas Mahasiswa

| Komponen | Isian |
| :--- | :--- |
| **Nama Mahasiswa** | Diva Prayoga Alpariji Putra |
| **NPM** | 237006173 |
| **Kelas / Semester** | F / 7 |
| **Mata Kuliah / Kode** | Blockchain / KP70067008 |
| **Dosen Pengampu** | Dr. Ir. Nur Widiyasono, M.Kom. |
| **Judul Kasus / Proyek** | Rancang Bangun Sistem Verifikasi Kredensial Akademik Berbasis Standar W3C Verifiable Credentials dan Smart Contract Permissioned Consortium Blockchain |
| **Tanggal Pelaksanaan** | 4–6 Oktober 2026 |

---

## 2. Struktur Sistematik Direktori Paket Artifak (`docs/artifak/`)

Paket artifak ini disusun secara terstruktur ke dalam sub-folder modular yang memuat seluruh berkas kode sumber asli, konfigurasi jaringan, data skema & fixture, skrip pengujian, dan diagram vektor yang mendukung laporan utama UTS:

```text
docs/artifak/
├── README.md                                             # [Indeks Utama] Panduan dan katalog berkas artifak UTS
│
├── 01_feasibility/                                       # [Case 1] Dokumen Studi Kelayakan & Arsitektur
│   ├── PRD_Prototype_Verifikasi_Kredensial_Akademik_AI_Agents.md # Spesifikasi kebutuhan sistem, stakeholder, & batasan
│   ├── vc_data_model.md                                  # Spesifikasi pemisahan data on-chain vs off-chain W3C VC v2.0
│   └── ADR-001-environment-and-node-baseline.md          # Architectural Decision Record baseline node & runtime
│
├── 02_crypto_merkle/                                     # [Case 2] Kriptografi Hash, Kanonisasi, & Fixture Data
│   ├── canonical.ts                                      # Algoritma Kanonisasi Deterministik RFC 8785 JSON (TypeScript)
│   ├── signer.ts                                         # Algoritma Tanda Tangan ECDSA secp256k1 & ecrecover (TypeScript)
│   ├── credential_schema.json                            # Skema validasi JSON schema W3C AcademicDegreeCredential
│   └── academic_credentials_fixtures.json                # Dataset sintetis 7 skenario ijazah akademik (SCN-VALID s/d SCN-UNAUTH)
│
├── 03_mini_blockchain/                                   # [Case 2 Lanjutan] Smart Contract & Core Registry Services
│   ├── CredentialRegistry.sol                            # Kode sumber Smart Contract Registri Kredensial (Solidity 0.8.30)
│   ├── ICredentialRegistry.sol                           # Interface resmi kontrak pintar pendaftaran & siklus hidup
│   ├── issuance.service.ts                               # Layanan penerbitan & anchoring komitmen on-chain (TypeScript)
│   ├── verification.service.ts                           # Layanan verifikasi 6-lapisan & proteksi replay nonce (TypeScript)
│   └── lifecycle.service.ts                              # Layanan manajemen mesin status (ACTIVE, SUSPENDED, REVOKED)
│
├── 04_konsensus/                                         # [Case 3] Konfigurasi Jaringan & Simulasi Konsensus QBFT
│   ├── genesis.json                                      # Konfigurasi Genesis Block 4-Node QBFT (Chain ID: 13371)
│   ├── docker-compose.yml                                # Orkestrasi multi-container 4 node validator Besu QBFT
│   ├── besu_network_README.md                            # Panduan operasional node validator konsorsium
│   └── simulate-consortium.ts                            # Skrip simulasi voting konsensus Byzantine Fault Tolerance (N >= 3f+1)
│
├── 05_bitcoin/                                           # [Case 4] Model Transaksi Bitcoin UTXO & Anti Double-Spending
│   ├── utxo_simulation.ts                                # Engine simulasi transaksi Bitcoin UTXO, fee calculation, & change
│   └── utxo_fixtures.json                                # Dataset transaksi berantai UTXO (TX-GEN s/d TX-SIM-03)
│
├── 06_ethereum/                                          # [Case 5] Deployment, Pengujian EVM, & Security QA
│   ├── deploy-registry.ts                                # Skrip deployment Smart Contract ke jaringan EVM lokal
│   ├── CredentialRegistry.test.ts                        # Unit test fungsional kontrak pintar (21 tests passing)
│   ├── Acceptance.security.test.ts                       # Uji keamanan ancaman STRIDE & Acceptance Tests AT-01 s/d AT-10
│   ├── benchmark.ts                                      # Skrip tolok ukur kinerja latensi P95, gas used, & throughput
│   └── secret-scan.ts                                    # Skrip pemindaian otomatis kebocoran rahasia & kredensial
│
└── 07_diagram/                                           # [Koleksi Diagram] Berkas Vektor Resolusi Tinggi (SVG)
    ├── README.md                                         # Katalog dan penjelasan teknis setiap diagram visual
    ├── diagram_arsitektur_jaringan.svg                   # Diagram arsitektur konsorsium 4-node & layers
    ├── diagram_alur_transaksi.svg                        # Diagram sequence alur 4 fase transaksi end-to-end
    ├── diagram_merkle_tree.svg                           # Diagram struktur pohon Merkle & jalur pembuktian (Merkle Proof)
    └── diagram_bitcoin_utxo.svg                          # Diagram alur transaksi model Bitcoin UTXO, change, & fee
```

---

## 3. Rincian dan Fungsi Setiap Berkas Artifak

### 3.1 Folder `01_feasibility/` (Studi Kelayakan & Arsitektur)
* **`PRD_Prototype_Verifikasi_Kredensial_Akademik_AI_Agents.md`**: Dokumen induk *Product Requirements Document* yang memuat perumusan masalah, analisis pemangku kepentingan (Issuer, Holder, Verifier, Admin, Auditor), batasan teknis, dan target pengujian.
* **`vc_data_model.md`**: Menjelaskan arsitektur pemisahan data on-chain vs off-chain untuk memastikan **Zero PII on Ledger** demi kepatuhan terhadap UU No. 27 Tahun 2022 (UU PDP).
* **`ADR-001-environment-and-node-baseline.md`**: Catatan keputusan arsitektural (*Architectural Decision Record*) mengenai pemilihan Node.js v22 LTS, Hardhat EVM, dan Hyperledger Besu QBFT.

### 3.2 Folder `02_crypto_merkle/` (Kriptografi & Kanonisasi)
* **`canonical.ts`**: Implementasi algoritma kanonisasi JSON deterministik (RFC 8785) untuk memastikan string payload diurutkan secara konsisten sebelum dihitung nilai hash komitmennya.
* **`signer.ts`**: Modul pembantu untuk penandatanganan payload menggunakan ECDSA secp256k1 serta pemulihan alamat penandatangan via `ecrecover`.
* **`credential_schema.json`**: Skema validasi struktural untuk dokumen ijazah W3C Verifiable Credentials v2.0.
* **`academic_credentials_fixtures.json`**: Dataset 7 skenario sintetis lengkap (kredensial sah S1/S2, kredensial suspended, revoked, expired, tampered GPA, dan unauthorized issuer).

### 3.3 Folder `03_mini_blockchain/` (Smart Contract & Core Services)
* **`CredentialRegistry.sol`**: Kode smart contract inti Solidity 0.8.30 yang bertindak sebagai *decentralized trust registry*.
* **`ICredentialRegistry.sol`**: Interface yang mendeklarasikan event, struktur data, enum status, dan signature fungsi kontrak.
* **`issuance.service.ts`**: Layanan backend untuk memvalidasi masukan akademik, menghitung hash komitmen `keccak256`, menandatangani dokumen, dan memicu transaksi `issueCredential` on-chain.
* **`verification.service.ts`**: Layanan verifikasi 6-lapisan (format W3C, verifikasi nonce fresh, ECDSA signature check, status pendaftaran issuer on-chain, kecocokan komitmen integritas, dan status aktif dokumen).
* **`lifecycle.service.ts`**: Layanan manajemen transisi status kredensial dan rekonstruksi jejak audit forensik.

### 3.4 Folder `04_konsensus/` (Konsensus & Jaringan P2P)
* **`genesis.json`**: Berkas blok awal konfigurasi Hyperledger Besu QBFT dengan Chain ID 13371, waktu blok 2 detik, dan 4 validator awal (UIS, ITBS, UGMS, LLDIKTI).
* **`docker-compose.yml`**: Orkestrasi 4 kontainer validator independen yang saling berkomunikasi melalui protokol Gossip P2P pada subnet bridge `172.20.0.0/16`.
* **`simulate-consortium.ts`**: Skrip otomatisasi yang membuktikan toleransi kesalahan Bizantium $N \ge 3f + 1$ di mana konsensus tetap sah meskipun 1 node validator mati/curang.

### 3.5 Folder `05_bitcoin/` (Model Transaksi UTXO)
* **`utxo_simulation.ts`**: Implementasi TypeScript yang memodelkan penelusuran UTXO, konsumsi total input, pembuatan output dan kembalian (*change address*), estimasi ukuran virtual (*vSize*), kalkulasi fee (sat/vB), dan penolakan instan terhadap *double spending*.
* **`utxo_fixtures.json`**: Catatan riwayat 4 transaksi simulasi UTXO berantai (TX-GEN-00, TX-SIM-01, TX-SIM-02, dan TX-SIM-03).

### 3.6 Folder `06_ethereum/` (Deployment & Security QA)
* **`deploy-registry.ts`**: Skrip deployment Hardhat untuk menginisialisasi kontrak `CredentialRegistry` dan menetapkan alamat admin dewan konsorsium.
* **`CredentialRegistry.test.ts`**: Pengujian unit komprehensif smart contract (21 tests passing).
* **`Acceptance.security.test.ts`**: Pengujian penetrasi keamanan terhadap ancaman STRIDE T-01 s/d T-06 serta pembuktian seluruh 10 Mandatory Acceptance Tests (AT-01 s/d AT-10).
* **`benchmark.ts`**: Skrip pengujian kinerja yang mengukur latensi P50/P95 dan throughput sistem sebanyak 50 iterasi per operasi.
* **`secret-scan.ts`**: Skrip audit pemindaian kebocoran kredensial rahasia (*zero secret leak*).

### 3.7 Folder `07_diagram/` (Koleksi Diagram Vektor)
* Memuat 4 berkas vektor SVG resolusi tinggi: Arsitektur Jaringan, Alur Transaksi, Merkle Tree, dan Model Transaksi Bitcoin UTXO, lengkap dengan dokumen panduan katalog.

---

## 4. Cara Menjalankan Uji dan Reproduksi Artefak

Untuk memverifikasi keabsahan seluruh kode dan artefak pada paket ini, jalankan perintah berikut dari direktori root proyek:

```powershell
# 1. Jalankan Seluruh Rangkaian Pengujian Otomatis (71 Passing Tests)
npm run test:all

# 2. Jalankan Simulasi Konsensus Konsorsium 4-Node QBFT
npx hardhat run docs/artifak/04_konsensus/simulate-consortium.ts

# 3. Jalankan Simulasi Model Transaksi Bitcoin UTXO
npx ts-node docs/artifak/05_bitcoin/utxo_simulation.ts

# 4. Jalankan Pengujian Tolok Ukur Kinerja (Benchmark Latensi P95)
npm run benchmark

# 5. Jalankan Pemindaian Kebocoran Rahasia (Secret Scan)
npm run scan:secrets
```

---