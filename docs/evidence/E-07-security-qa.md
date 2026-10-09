# Evidensi E-07: Security QA, Threat-Driven Tests & Acceptance Matrix (Milestone M7)

## 1. Metadata Pengujian
* **Timestamp**: 2026-10-06T11:53:00+07:00
* **Milestone**: M7 (Security QA & Mandatory Acceptance Tests AT-01 s/d AT-10)
* **Status**: PASS / VERIFIED (23/23 Security Tests Passed, 71/71 Total Suite Passed)
* **Secret Scan**: Clean (0 Leaked Secret / Production Private Key)
* **Pelaksana**: AI Coding Agent (Antigravity IDE)
* **Dasar Penilaian PRD**: Section 13 (Security & Privacy Requirements), Section 14.2 (Mandatory Acceptance Tests AT-01 s/d AT-10), dan Section 18 (Definition of Done M7).

---

## 2. Matriks Mandatory Acceptance Tests (AT-01 s/d AT-10)

Sesuai **PRD Section 14.2**, berikut adalah hasil eksekusi pengujian penerimaan wajib:

| ID | Skenario Uji | Tindakan / Vektor Uji | Kondisi Lulus (*Pass Condition*) | Hasil Real | Status |
|---|---|---|---|---|---|
| **AT-01** | Penerbitan Resmi Berwenang | Authorized issuer menerbitkan kredensial | Transaksi sukses, event terpancar, status on-chain `ACTIVE` | Transaksi ditambang, event `CredentialIssued` valid, status `ACTIVE` | **PASS** |
| **AT-02** | Verifikasi Kredensial Sah | Verifier memeriksa kredensial valid | Hasil = `VERIFIED` / `ACTIVE` | Lolos seluruh 6 lapisan verifikasi, tanpa pesan error | **PASS** |
| **AT-03** | Modifikasi Atribut Akademik | Mengubah GPA/Nama pada berkas ijazah | Hasil = `INVALID` / `TAMPERED` | Terdeteksi perbedaan keccak256 commitment hash | **PASS** |
| **AT-04** | Penerbitan Tanpa Hak Akses | Akun penyerang memanggil `issueCredential` | Transaksi di-revert on-chain | Revert `UnauthorizedCaller` | **PASS** |
| **AT-05** | Pencabutan Tanpa Hak Akses | Akun penyerang memanggil `revokeCredential` | Transaksi di-revert on-chain | Revert `UnauthorizedCaller` | **PASS** |
| **AT-06** | Verifikasi Kredensial Dicabut | Memeriksa kredensial berstatus `REVOKED` | Hasil = `REVOKED` / rejected | Ditolak verifier dengan alasan kredensial telah dicabut | **PASS** |
| **AT-07** | Verifikasi Kredensial Kedaluwarsa| Memeriksa kredensial melampaui `validUntil` | Hasil = `EXPIRED` / rejected | Ditolak verifier dengan status `EXPIRED` | **PASS** |
| **AT-08** | Serangan Pemakaian Ulang (Replay)| Mengirim ulang presentasi dengan nonce sama | Presentasi kedua ditolak (*one-time nonce*) | Ditolak dengan alasan `REPLAY_ATTACK_DETECTED` | **PASS** |
| **AT-09** | Penerbit Tidak Terdaftar | Kredensial dari issuer yang belum didaftarkan | Verifikasi ditolak | Ditolak dengan alasan `ISSUER_TIDAK_TERDAFTAR` | **PASS** |
| **AT-10** | Ketahanan Gangguan RPC/Node | RPC registry terputus / alamat contract keliru | Mengembalikan error terkontrol, bukan false `VERIFIED` | Terkendali mengembalikan `isValid: false` | **PASS** |

---

## 3. Matriks Pengujian Ancaman Keamanan Smart Contract (Threat T-01 s/d T-06)

| ID Ancaman | Deskripsi Ancaman | Vektor Penyerangan | Pertahanan Kontrak | Status |
|---|---|---|---|---|
| **T-01** | Unauthorized Governance | Penyerang mencoba mendaftarkan issuer / mengubah admin | Revert `UnauthorizedCaller` | **PASS** |
| **T-02** | Forged Issuance | Penyerang mencoba menerbitkan ijazah atas nama kampus lain | Revert `UnauthorizedCaller` | **PASS** |
| **T-03** | Inactive Issuer Abuse | Issuer yang dinonaktifkan mencoba menerbitkan ijazah baru | Revert `IssuerInactive` | **PASS** |
| **T-04** | Cross-Issuer Tampering | Kampus B mencoba mencabut ijazah milik Kampus A | Revert `UnauthorizedCaller` | **PASS** |
| **T-05** | Terminal State Tampering | Penyerang mencoba mengaktifkan kembali ijazah `REVOKED` | Revert `CredentialAlreadyRevoked` | **PASS** |
| **T-06** | Non-Existent Entity Probing | Memanggil manipulasi state pada ID fiktif | Revert `CredentialNotFound` | **PASS** |

---

## 4. Hasil Pemindaian Rahasia (Secret Scan)

Skrip pemindaian otomatis [`scripts/secret-scan.ts`](file:///c:/Users/Administrator/Documents/Block%20chain/UTS/scripts/secret-scan.ts) memeriksa seluruh file kode sumber, berkas konfigurasi, data sintetis, dan dokumentasi:
```text
=== Memulai Pemindaian Keamanan & Secret Scan (Milestone M7) ===
✓ HASIL: 0 Rahasia / Kredensial Produksi Terdeteksi.
✓ Repositori 100% bersih dari API keys, AWS tokens, dan private keys produksi.
```

---

## 5. Log Eksekusi Pengujian Hardhat

```text
> npm run test:security

  CredentialRegistry - Security & Threat-Driven Negative Tests (M2 / M7)
    Threat T-01: Unauthorized Issuer Governance
      √ PENYERANG TIDAK BISA mendaftarkan dirinya sendiri sebagai issuer (41ms)
      √ PENYERANG TIDAK BISA mengubah status aktif/non-aktif issuer
      √ PENYERANG TIDAK BISA mengambil alih peran Governance Admin
    Threat T-02: Unauthorized & Forged Credential Issuance
      √ PENYERANG TIDAK BISA menerbitkan kredensial mengatasnamakan Issuer A
      √ ISSUER B TIDAK BISA menerbitkan kredensial mengatasnamakan Issuer A (Cross-Issuer Forgery)
      √ PENYERANG TIDAK BISA menerbitkan kredensial dengan issuerId fiktif/tidak terdaftar
    Threat T-03: Deactivated/Inactive Issuer Protection
      √ ISSUER YANG DINONAKTIFKAN TIDAK BISA menerbitkan kredensial baru
    Threat T-04: Cross-Issuer Lifecycle Tampering
      √ PENYERANG TIDAK BISA mencabut atau menangguhkan kredensial milik orang lain
      √ ISSUER B TIDAK BISA mencabut kredensial yang diterbitkan oleh Issuer A
    Threat T-05: Terminal State Inviolability (Revocation Cannot Be Undone)
      √ KREDENSIAL YANG SUDAH DICABUT (REVOKED) TIDAK DAPAT DIAKTIFKAN KEMBALI
      √ KREDENSIAL YANG SUDAH DICABUT (REVOKED) TIDAK BISA DIUBAH MENJADI SUSPENDED
    Threat T-06: Non-Existent Entity Probing
      √ Revert dengan CredentialNotFound jika entitas kredensial tidak pernah diterbitkan (40ms)
      √ Revert dengan IssuerNotFound jika entitas issuer tidak pernah didaftarkan

  Milestone 7 (M7) - Mandatory Acceptance & Threat Tests (AT-01 s/d AT-10)
    √ AT-01: Penerbit resmi berhasil menerbitkan kredensial, transaksi sukses, status on-chain ACTIVE
    √ AT-02: Verifier memvalidasi kredensial sah dan mengembalikan status VERIFIED / ACTIVE (95ms)
    √ AT-03: Memodifikasi satu atribut akademik ditolak dengan status TAMPERED
    √ AT-04: Akun tanpa otorisasi mencoba menerbitkan kredensial dan transaksi di-revert on-chain
    √ AT-05: Akun tanpa otorisasi mencoba mencabut kredensial dan transaksi di-revert on-chain
    √ AT-06: Kredensial yang dicabut ditolak oleh verifier dengan status REVOKED
    √ AT-07: Kredensial yang kedaluwarsa ditolak oleh verifier dengan status EXPIRED
    √ AT-08: Replay attack ditolak saat presentasi dengan nonce sama digunakan ulang
    √ AT-09: Kredensial dengan issuer tidak terdaftar ditolak oleh verifier
    √ AT-10: Penanganan kegagalan RPC/Node mengembalikan pesan kesalahan terkontrol (tidak ada false VERIFIED)

  23 passing (2s)
```

---

## 6. Kesimpulan DoD M7
Seluruh kriteria kelulusan **Milestone 7 (M7)** telah terpenuhi:
1. 10/10 Mandatory Acceptance Tests (AT-01 s/d AT-10) lulus 100%.
2. 13/13 Security Threat-Driven Tests (T-01 s/d T-06) lulus 100%.
3. Pemindaian kebocoran kredensial menghasilkan **0 rahasia/private key produksi**.
