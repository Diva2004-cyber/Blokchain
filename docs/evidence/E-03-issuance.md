# Evidensi E-03: Penerbitan Verifiable Credential & Anchoring Komitmen On-Chain (Milestone M3)

## 1. Metadata Pengujian
* **Timestamp**: 2026-10-06T11:25:00+07:00
* **Milestone**: M3 (Issuance & Commitment Anchoring Flow)
* **Status**: PASS / VERIFIED
* **Pelaksana**: AI Coding Agent (Antigravity IDE)

---

## 2. Rincian Fixture Masukan (Input Fixture)
* **Scenario ID**: `SCN-VALID-01`
* **Sumber Data**: [`data/synthetic/academic_credentials_fixtures.json`](file:///c:/Users/Administrator/Documents/Block%20chain/UTS/data/synthetic/academic_credentials_fixtures.json)
* **Credential ID**: `urn:credential:academic:uis-s1-2026-001`
* **On-Chain Credential ID (bytes32)**: `0x647bbca44376cfa9eaebf31a295c52c67fe997ad9cb443210fc977e53f191b4b`
* **Issuer ID**: `did:web:uis.ac.id` (Universitas Indonesia Sintetis)
* **Issuer Address**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
* **Data Subjek Akademik**:
  ```json
  {
    "id": "did:key:z6Mksynth1234567890holder1",
    "studentIdentifier": "MHS-SYNTH-2026-001",
    "fullName": "Budi Santoso Sintetis",
    "degreeName": "Sarjana Komputer (S.Kom.)",
    "studyProgram": "Teknik Informatika",
    "faculty": "Fakultas Ilmu Komputer",
    "gpa": "3.85",
    "graduationDate": "2026-08-15",
    "honors": "Magna Cum Laude"
  }
  ```

---

## 3. Komitmen Kriptografis & Tanda Tangan Digital (Off-Chain Proof)

1. **Deterministic Canonicalization**:
   Payload `credentialSubject` diurutkan secara rekursif menggunakan algoritma kanonikal JSON deterministik (`apps/api/src/crypto/canonical.ts`).
2. **Kalkulasi Komitmen Integritas**:
   $$\text{commitment} = \text{keccak256}(\text{canonicalPayload})$$
   * Nilai Hash Komitmen: `0x` + 64-karakter hex yang merepresentasikan integritas penuh dokumen.
3. **Tanda Tangan Digital Issuer**:
   * Metode: `EthereumEcdsaSignature2026` (secp256k1 via `ethers.signMessage`)
   * Verifikasi Pemulihan: Tanda tangan digital pada dokumen off-chain berhasil dipulihkan (*recovered*) 100% tepat ke alamat pengendali issuer `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`.

---

## 4. Hasil Transaksi Anchoring On-Chain

* **Smart Contract Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3` (Hardhat Local Chain ID `31337`)
* **Metode Dipanggil**: `issueCredential(bytes32,string,bytes32,uint32,uint256)`
* **Event Terpancar**:
  ```text
  event CredentialIssued(
      bytes32 indexed credentialId,
      string indexed issuerId,
      bytes32 commitment,
      uint32 schemaVersion,
      uint256 validUntil,
      uint256 issuedAt
  )
  ```
* **Status Akhir di Blockchain**: `Status.ACTIVE` (`1`)
* **Hasil Fungsi `isCredentialValid`**: `true`

---

## 5. Log Eksekusi Uji Integrasi (End-to-End)

```powershell
npm run test:integration
```

**Output Log:**
```text
> academic-credential-blockchain@1.0.0 test:integration
> npx hardhat test tests/integration/Issuance.integration.test.ts

  Milestone 3 (M3) - End-to-End Issuance & Anchoring Integration Tests
    √ M3-01: Berhasil menerbitkan VC sintetik SCN-VALID-01 dan meng-anchor komitmen ke Smart Contract (153ms)
    √ M3-02: Berhasil menerbitkan VC sintetik SCN-VALID-02 (ITBS) tanpa expiry (permanen)
    √ M3-03: Deteksi Pemalsuan Integritas (Tamper Detection via Commitment Hash Mismatch)
    √ M3-04: Menolak Anchoring Kredensial jika dilakukan oleh Signer yang tidak berhak

  4 passing (2s)
```

---

## 6. Uji Ketahanan Pemalsuan (Tamper Detection Test)
Pada pengujian `M3-03`, modifikasi artifisial dilakukan pada data nilai IPK mahasiswa (diubah dari `3.85` menjadi `4.00`). Hasil pengujian membuktikan bahwa komitmen yang dihitung ulang menjadi berbeda secara total dengan komitmen yang telah terpatri di blockchain, sehingga pemalsuan data langsung terdeteksi seketika (*tamper detected*).

---

## 7. Kesimpulan & Status Ketercapaian M3
* **Definition of Done PRD**: *Issuer can create signed VC + anchor commitment/status.* $\rightarrow$ **TERPENUHI 100%**.
* Milestone M3 resmi berstatus **SELESAI (COMPLETED)** dan repositori siap melanjutkan ke **M4 (Verification Service: Signature, Status, Expiry)**.
