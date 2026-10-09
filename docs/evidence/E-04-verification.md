# Evidensi E-04: Matriks Hasil Verifikasi Kredensial & Presentasi (Milestone M4)

## 1. Metadata Pengujian
* **Timestamp**: 2026-10-06T11:32:00+07:00
* **Milestone**: M4 (Verification Service: Signature, Status, Expiry, dan Presentasi Verifier)
* **Status**: PASS / VERIFIED (11/11 Integration Tests Passed)
* **Pelaksana**: AI Coding Agent (Antigravity IDE)
* **Dasar Penilaian PRD**: Section 10 (Alur Verifikasi Verifier), Section 18 (Matriks Hasil Verifikasi), dan Ancaman AT-08 (Replay Nonce Prevention)

---

## 2. Matriks Hasil Verifikasi Kredensial Akademik (PRD Section 18)

| No | Skenario Uji | Kode Skenario | Status On-Chain | Kondisi Off-Chain | Hasil `isValid` | Final Status | Kode Alasan / Output Verifikasi | Status Test |
|---|---|---|---|---|---|---|---|---|
| 1 | Kredensial Sah & Aktif | `SCN-VALID-01` | `ACTIVE` (1) | Hash Cocok, Signature Valid, Belum Kedaluwarsa | **`true`** | `ACTIVE` | Lulus seluruh 6 lapisan verifikasi | **PASS** |
| 2 | Pemalsuan Nilai GPA | `SCN-TAMPERED-06` | `ACTIVE` (1) | Nilai GPA diubah sepihak (3.85 &rarr; 4.00) | **`false`** | `TAMPERED` | `DATA_DIPALSUKAN: Hash komitmen off-chain tidak cocok dengan jangkar on-chain` | **PASS** |
| 3 | Pemalsuan Nama Mahasiswa | `SCN-TAMPERED-06` | `ACTIVE` (1) | Nama mahasiswa diganti subjek lain | **`false`** | `TAMPERED` | `DATA_DIPALSUKAN: Hash komitmen off-chain tidak cocok dengan jangkar on-chain` | **PASS** |
| 4 | Kredensial Ditangguhkan | `SCN-SUSPENDED-03` | `SUSPENDED` (2) | Dokumen asli tidak diubah | **`false`** | `SUSPENDED` | `KREDENSIAL_DITANGGUHKAN: Status saat ini SUSPENDED` | **PASS** |
| 5 | Kredensial Dicabut Permanen | `SCN-REVOKED-04` | `REVOKED` (3) | Dokumen asli tidak diubah | **`false`** | `REVOKED` | `KREDENSIAL_DICABUT: Status saat ini REVOKED (Permanen)` | **PASS** |
| 6 | Kredensial Kedaluwarsa | `SCN-EXPIRED-05` | `ACTIVE` (1) | Melewati batas waktu `validUntil` | **`false`** | `EXPIRED` | `KREDENSIAL_KEDALUWARSA: Masa berlaku off-chain/on-chain telah habis` | **PASS** |
| 7 | Penerbit Tidak Terdaftar | `SCN-UNAUTH-07` | `NONE` (0) | Diterbitkan institusi tanpa registrasi blockchain | **`false`** | `NOT_FOUND` | `ISSUER_TIDAK_TERDAFTAR: did:web:kampus-palsu.ac.id tidak terdaftar di blockchain` | **PASS** |
| 8 | Tanda Tangan Palsu/Rusak | `SCN-INVALID-SIG` | `ACTIVE` (1) | Byte tanda tangan proofValue diubah acak | **`false`** | `INVALID_SIGNATURE` | `TANDA_TANGAN_TIDAK_SAH: Signature tidak cocok dengan alamat issuer` | **PASS** |

---

## 3. Matriks Hasil Verifikasi Verifiable Presentation (VP) & Replay Prevention

| No | Skenario Uji | Deskripsi Skenario | Hasil `isValid` | Pemeriksaan Spesifik | Status Test |
|---|---|---|---|---|---|
| 9 | Presentasi Sah & Lengkap | Pemegang menyajikan VP dengan target verifier `REQ-TEST-2026-001`, nonce acak, dan audiens yang cocok | **`true`** | `nonceValid: true`, `audienceValid: true`, `requestNotExpired: true`, `credentialsValid: true`, `requiredAttributesSupplied: true` | **PASS** |
| 10 | Replay Attack Defense (AT-08) | Penyerang menguping dan mengirimkan ulang paket VP dengan nonce yang sama ke verifier yang sama | **`false`** | `REPLAY_ATTACK_DETECTED: Nonce telah digunakan sebelumnya (one-time nonce violation)` | **PASS** |
| 11 | Klaim Atribut Tidak Lengkap | Presentasi diserahkan namun atribut wajib yang disyaratkan oleh verifier tidak disertakan dalam klaim | **`false`** | `ATRIBUT_TIDAK_LENGKAP: Klaim [nonExistentField123] tidak disertakan` | **PASS** |

---

## 4. Log Eksekusi Uji Integrasi M4 (Hardhat Network)

```text
> npx hardhat test tests/integration/Verification.integration.test.ts

  Milestone 4 (M4) - Verification Service Integration Tests
    Skenario 1: Kredensial Sah dan Aktif (SCN-VALID-01)
      √ Harus mengembalikan isValid: true dan status: ACTIVE untuk VC yang valid (125ms)
    Skenario 2: Integritas Data Dipalsukan (Tamper Detection - SCN-TAMPERED-06)
      √ Harus menolak kredensial jika GPA atau data subject diubah (41ms)
      √ Harus menolak kredensial jika nama mahasiswa diubah
    Skenario 3: Kredensial Ditangguhkan (Suspended - SCN-SUSPENDED-03)
      √ Harus menolak kredensial yang berstatus SUSPENDED on-chain
    Skenario 4: Kredensial Dicabut (Revoked - SCN-REVOKED-04)
      √ Harus menolak kredensial yang berstatus REVOKED on-chain secara permanen
    Skenario 5: Kredensial Kedaluwarsa (Expired - SCN-EXPIRED-05)
      √ Harus menolak kredensial yang melewati masa berlaku validUntil
    Skenario 6: Penerbit Tidak Terdaftar / Unauthorized (SCN-UNAUTH-07)
      √ Harus menolak kredensial yang diterbitkan oleh issuer yang belum terdaftar di blockchain
    Skenario 7: Tanda Tangan Kriptografis Tidak Sah / Rusak
      √ Harus menolak kredensial jika proof signature diutak-atik
    Skenario 8, 9, 10: Verifiable Presentation & Replay Attack Prevention (AT-08)
      √ Skenario 8: Harus menyetujui Verifiable Presentation yang sah dan sesuai request
      √ Skenario 9 (AT-08): Harus menggagalkan Replay Attack jika nonce yang sama dipakai ulang
      √ Skenario 10: Harus menolak Verifiable Presentation jika atribut wajib yang diminta tidak ada

  11 passing (2s)
```

---

## 5. Ringkasan Kesimpulan M4
Seluruh persyaratan **Milestone 4 (M4)** sesuai PRD Section 10 dan Section 18 telah terpenuhi:
1. Layanan verifikasi 6-lapis (`VerificationService`) berhasil menguji integritas, tanda tangan kriptografis secp256k1, status siklus hidup on-chain, masa kedaluwarsa, serta otorisasi issuer.
2. Presentasi Verifiable Presentation (VP) dilindungi dari serangan *replay attack* (AT-08) melalui pencatatan *one-time nonce*.
3. Endpoint API verifikasi telah tersedia di [`apps/api/src/app.ts`](file:///c:/Users/Administrator/Documents/Block%20chain/UTS/apps/api/src/app.ts):
   - `POST /api/credentials/verify`
   - `POST /api/presentations/request`
   - `POST /api/presentations/verify`
