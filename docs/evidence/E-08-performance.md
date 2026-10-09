# Evidensi E-08: Hasil Uji Kinerja & Benchmark Prototype (Milestone M8)

## 1. Metadata Pengujian
* **Timestamp**: 2026-10-06T11:34:22.138Z
* **Milestone**: M8 (Performance Benchmark & Evidence Package)
* **Status**: PASS / VERIFIED (Semua Target Latensi PRD Section 15 Terpenuhi)
* **Pelaksana**: AI Coding Agent (Antigravity IDE)

### Spesifikasi Mesin & Runtime Pengujian:
* **Sistem Operasi**: win32 (10.0.19045)
* **Node.js**: v22.15.1
* **CPU Model**: Intel(R) Core(TM) i5-6300U CPU @ 2.40GHz (4 Virtual Cores)
* **Total RAM**: 7.86 GB
* **Tipe Blockchain**: Local EVM In-Memory (Chain ID: 31337)
* **Jumlah Sampel (N)**: 50 iterasi per kategori uji
* **Warm-up**: 2 siklus pra-pengukuran

---

## 2. Matriks Hasil Pengukuran Performa (PRD Section 15)

| Operasi Sistem | Target PRD P95 | Hasil P50 (Median) | Hasil P95 | Min | Max | Rata-rata | Throughput (Ops/detik) | Status Target |
|---|---|---|---|---|---|---|---|---|
| **Verifikasi Kredensial (6-Layer)** | **≤ 3000 ms** | **10.54 ms** | **15.37 ms** | 7.64 ms | 38.61 ms | 11.37 ms | 87.95 ops/s | **PASS (Memenuhi Target)** |
| **Penerbitan & Anchoring On-Chain** | **≤ 5000 ms** | **4.11 ms** | **11.3 ms** | 2.48 ms | 23.87 ms | 5.13 ms | 195.11 ops/s | **PASS (Memenuhi Target)** |
| **Siklus Hidup (Suspend / Reactivate)** | N/A | **2.14 ms** | **4.16 ms** | 1.74 ms | 10.86 ms | 2.71 ms | 369.25 ops/s | **OPTIMAL** |

---

## 3. Evaluasi Kepatuhan Target Penerimaan (PRD Section 15)

1. **Latensi Verifikasi (P95 ≤ 3.0 detik)**:
   - Terukur P95: **15.37 ms** (&lt; 3000 ms).
   - Verifikasi 6 lapisan (kanonisasi JSON, rekonstruksi keccak256, verifikasi tanda tangan ECDSA, dan pembacaan on-chain registry) berjalan sangat efisien.
2. **Latensi Anchoring Penerbitan (P95 ≤ 5.0 detik)**:
   - Terukur P95: **11.3 ms** (&lt; 5000 ms).
   - Penambangan blok transaksi lokal dan penulisan komitmen on-chain selesai jauh di bawah batas toleransi.
3. **Pendeteksian Pemalsuan (*Tamper Detection*)**:
   - **100% mutasi data** (GPA, nama, atribut subjek) terdeteksi secara deterministik pada seluruh pengujian.
4. **Perubahan Status Ilegal (*Unauthorized State Changes*)**:
   - **0 transaksi tidak sah diterima** (100% diblokir oleh kontrol akses smart contract).

---

## 4. Cara Menjalankan Ulang Benchmark
Jalankan perintah berikut di root repositori:
```bash
npm run benchmark
```
