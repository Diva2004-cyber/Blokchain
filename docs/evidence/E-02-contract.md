# Evidensi E-02: Kompilasi, Pengujian, dan Deployment Smart Contract (Milestone M2)

## 1. Metadata Pengujian
* **Timestamp**: 2026-10-06T11:15:00+07:00
* **Milestone**: M2 (Contract Implementation & Testing)
* **Status**: PASS / VERIFIED
* **Pelaksana**: AI Coding Agent (Antigravity IDE)

---

## 2. Artefak Smart Contract

| Parameter | Nilai / Path |
| :--- | :--- |
| **Contract Name** | `CredentialRegistry` |
| **Interface** | `ICredentialRegistry` |
| **Solidity Version** | `^0.8.28` (kompatibel `0.8.30`) |
| **Optimizer** | Enabled (200 runs, evm target: `paris`) |
| **Source Path** | [`contracts/CredentialRegistry.sol`](file:///c:/Users/Administrator/Documents/Block%20chain/UTS/contracts/CredentialRegistry.sol) |
| **Compiled Artifact** | `artifacts/contracts/CredentialRegistry.sol/CredentialRegistry.json` |
| **TypeChain Typings** | `typechain-types/contracts/CredentialRegistry.ts` (ethers-v6) |
| **Deployment Script** | [`scripts/deploy-registry.ts`](file:///c:/Users/Administrator/Documents/Block%20chain/UTS/scripts/deploy-registry.ts) |
| **Local Deployed Address** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| **Chain ID** | `31337` (Hardhat Network / Localhost) |
| **Deployment Tx Hash** | `0x9ff2406bac03fc6a4d1c0a5be5cf2f1911f2f0b1373e80b1839913c86df36ca5` |

---

## 3. Hasil Kompilasi Kontrak

```powershell
npx hardhat compile --force
```

**Hasil Luaran:**
```text
Generating typings for: 2 artifacts in dir: typechain-types for target: ethers-v6
Successfully generated 10 typings!
Compiled 2 Solidity files successfully (evm target: paris).
```

---

## 4. Hasil Unit Tests (`blockchain/test/CredentialRegistry.test.ts`)

```powershell
npm test
```

**Hasil Luaran:**
```text
  CredentialRegistry - Unit Tests
    1. Deployment & Governance Admin
      √ harus menetapkan deployer sebagai admin
      √ harus mengizinkan transfer kepemilikan admin ke alamat baru
      √ harus menolak transfer admin ke alamat address(0)
      √ harus menolak jika non-admin mencoba transferAdmin
    2. Registrasi & Manajemen Issuer
      √ harus berhasil mendaftarkan issuer baru oleh admin (74ms)
      √ harus dapat mengambil data issuer berdasarkan address
      √ harus menolak registrasi issuer duplikat
      √ harus menolak registrasi dengan issuerAddress zero address
      √ harus menolak registrasi dengan issuerId kosong
      √ harus dapat mengubah status aktif/non-aktif issuer
    3. Penerbitan Kredensial (issueCredential)
      √ harus berhasil menerbitkan kredensial permanen (validUntil = 0) (61ms)
      √ harus berhasil menerbitkan kredensial dengan batas masa berlaku masa depan
      √ harus menolak jika validUntil sudah kedaluwarsa saat diterbitkan
      √ harus menolak penerbitan dengan commitment bytes32(0)
      √ harus menolak penerbitan kredensial duplikat
    4. Siklus Hidup Kredensial (Suspend, Reactivate, Revoke)
      √ harus dapat menangguhkan kredensial (ACTIVE -> SUSPENDED)
      √ harus dapat mengaktifkan kembali kredensial (SUSPENDED -> ACTIVE)
      √ harus menolak reaktivasi kredensial yang sudah berstatus ACTIVE
      √ harus dapat mencabut kredensial secara permanen (ACTIVE -> REVOKED)
      √ harus memastikan status REVOKED adalah terminal (tidak bisa di-suspend atau di-reactivate) (40ms)
      √ harus mengembalikan isCredentialValid false jika masa berlaku telah lewat

  21 passing (2s)
```

---

## 5. Hasil Security Negative Tests (`tests/security/CredentialRegistry.security.test.ts`)

```powershell
npm run test:security
```

**Hasil Luaran:**
```text
  CredentialRegistry - Security & Threat-Driven Negative Tests (M2 / M7)
    Threat T-01: Unauthorized Issuer Governance
      √ PENYERANG TIDAK BISA mendaftarkan dirinya sendiri sebagai issuer (83ms)
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
      √ Revert dengan CredentialNotFound jika entitas kredensial tidak pernah diterbitkan
      √ Revert dengan IssuerNotFound jika entitas issuer tidak pernah didaftarkan

  13 passing (2s)
```

---

## 6. Pemeriksaan Statis Tipe (Typecheck)

```powershell
npm run typecheck
```

**Hasil Luaran:**
```text
> academic-credential-blockchain@1.0.0 typecheck
> tsc --noEmit
(Exit Code 0, Tanpa Error)
```

---

## 7. Kesimpulan & Status Ketercapaian M2
* **Definition of Done PRD**: *Registry compiles; unit/security tests pass.* $\rightarrow$ **TERPENUHI 100%**.
* Total 34 pengujian otomatis (21 unit + 13 security tests) berhasil dilewati dengan sempurna (*0 failures*).
* Milestone M2 resmi berstatus **SELESAI (COMPLETED)** dan repositori siap melanjutkan ke **M3 (Issuance Service & VC Anchor)**.
