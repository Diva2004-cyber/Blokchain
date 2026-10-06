# Dokumen Arsitektur: Data Model Verifiable Credential (W3C VC v2.0)

## 1. Ikhtisar & Standar Acuan
Arsitektur data kredensial akademik dalam proyek ini mengadopsi standar **W3C Verifiable Credentials Data Model v2.0**. Desain ini memisahkan secara tegas antara data akademik lengkap yang berada di **off-chain** dan data komitmen integritas serta status registry yang berada di **on-chain**.

---

## 2. Pemisahan Data On-Chain vs. Off-Chain

| Komponen | Lokasi Penyimpanan | Sensitivitas | Deskripsi & Tujuan |
| :--- | :--- | :--- | :--- |
| **`id` / `credentialId`** | Off-Chain & On-Chain | Rendah | Identifier stabil kredensial (UUID / URN). |
| **`type`** | Off-Chain | Rendah | Tipe kredensial (`VerifiableCredential`, `AcademicDegreeCredential`). |
| **`issuer`** | Off-Chain & On-Chain | Sedang | DID issuer (`did:web:uis.ac.id`) dan alamat Ethereum issuer yang terdaftar. |
| **`validFrom` / `validUntil`**| Off-Chain (opsional On-Chain) | Sedang | Jendela masa berlaku kredensial. |
| **`credentialSubject`** | **Off-Chain Saja (Wallet)** | **Tinggi (PII)** | Data akademik lengkap: Nama mahasiswa, NIM, Jurusan, IPK, Tanggal Lulus. |
| **`commitment` (Hash)** | **On-Chain (Smart Contract)** | Rendah | Hash kriptografis integritas payload kredensial untuk deteksi pemalsuan (*tamper detection*). |
| **`credentialStatus`** | **On-Chain (Smart Contract)** | Sedang | Status saat ini: `ACTIVE`, `SUSPENDED`, atau `REVOKED`. |
| **`proof`** | Off-Chain | Tinggi (Kriptografi) | Tanda tangan digital issuer (ECDSA secp256k1) yang memvalidasi otentisitas dokumen. |

> **Peringatan Privasi**: Data PII (Nama, NIM, IPK, Transkrip) **TIDAK PERNAH** disimpan di blockchain. Melakukan hashing pada data pribadi yang mudah ditebak (*guessable*) tidak serta merta menjadikannya anonim, sehingga seluruh data akademik mentah dipertahankan di luar rantai (*off-chain*).

---

## 3. Skema Data Logis (JSON Structure)

Contoh representasi kredensial sintetik sesuai standar:

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://example.edu/schemas/academic-v2"
  ],
  "id": "urn:credential:academic:uis-s1-2026-001",
  "type": [
    "VerifiableCredential",
    "AcademicDegreeCredential"
  ],
  "issuer": {
    "id": "did:web:uis.ac.id",
    "name": "Universitas Indonesia Sintetis",
    "ethereumAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  },
  "validFrom": "2026-08-20T00:00:00Z",
  "validUntil": "2036-08-20T23:59:59Z",
  "credentialSubject": {
    "id": "did:key:z6Mksynth1234567890holder1",
    "studentIdentifier": "MHS-SYNTH-2026-001",
    "fullName": "Budi Santoso Sintetis",
    "degreeName": "Sarjana Komputer (S.Kom.)",
    "studyProgram": "Teknik Informatika",
    "faculty": "Fakultas Ilmu Komputer",
    "gpa": "3.85",
    "graduationDate": "2026-08-15",
    "honors": "Magna Cum Laude"
  },
  "credentialStatus": {
    "id": "urn:credential:academic:uis-s1-2026-001#status",
    "type": "EthereumCredentialRegistry2026",
    "registryAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "credentialIdOnChain": "0x0000000000000000000000000000000000000000000000000000000000000001"
  },
  "proof": {
    "type": "EthereumEcdsaSignature2026",
    "created": "2026-08-20T01:00:00Z",
    "verificationMethod": "did:web:uis.ac.id#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "0x..."
  }
}
```

---

## 4. Algoritma Kalkulasi Komitmen (*Commitment Calculation*)
Untuk mengikat kredensial off-chain ke smart contract tanpa membocorkan isi data:
1. Canonical string dihasilkan dari pengurutan deterministik field `credentialSubject` dan `id`.
2. Hash dihitung menggunakan fungsi hash keccak256:
   $$\text{commitment} = \text{keccak256}(\text{canonicalPayload})$$
3. Nilai commitment disimpan di blockchain saat pemanggilan `issueCredential(...)`.
4. Jika ada perubahan sekecil apa pun pada data subjek (misalnya nilai IPK diubah dari 3.85 menjadi 4.00), hash hasil kalkulasi verifier tidak akan cocok dengan komitmen on-chain (*tamper detected*).

---

## 5. Mesin Status Kredensial (*State Machine*)

```
             ┌────────────────────────┐
             │         ACTIVE         │
             └───────┬────────┬───────┘
                     │        │
      suspend()      │        │ revoke()
                     ▼        ▼
       ┌──────────────────┐  ┌──────────────────┐
       │    SUSPENDED     │  │     REVOKED      │
       └─────────┬────────┘  └──────────────────┘
                 │                      ▲
    reactivate() │                      │ revoke()
                 └──────────────────────┘
```

* **ACTIVE**: Kredensial sah dan berlaku penuh.
* **SUSPENDED**: Kredensial ditangguhkan sementara (misal: klarifikasi administrasi). Dapat diaktifkan kembali (`reactivate`) jika memenuhi syarat.
* **REVOKED**: Kredensial dibatalkan permanen (*terminal state*). Tidak dapat diaktifkan kembali.
