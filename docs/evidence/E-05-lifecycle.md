# Evidensi E-05: Credential Lifecycle State Machine & Audit Trail (Milestone M5)

## 1. Metadata Pengujian
* **Timestamp**: 2026-10-06T11:40:00+07:00
* **Milestone**: M5 (Lifecycle State Machine: Suspend, Reactivate, Revoke, Role Access Control, dan On-Chain Audit Trail)
* **Status**: PASS / VERIFIED (12/12 Lifecycle Integration Tests Passed)
* **Pelaksana**: AI Coding Agent (Antigravity IDE)
* **Dasar Penilaian PRD**: Section 8.2 (Credential Status State Machine), Section 9.1 & 11 (Endpoints & Contract Methods), Section 18 (Definition of Done M5), serta FR-08 & FR-10.

---

## 2. Diagram State Machine & Guardrails (PRD Section 8.2)

```text
       ┌───────────────┐
       │     NONE      │
       └───────┬───────┘
               │ issueCredential()
               ▼
       ┌───────────────┐
 ┌────►│    ACTIVE     ├────────────────────┐
 │     └───────┬───────┘                    │
 │             │                            │
 │ reactivate  │ suspend                    │ revoke
 │ Credential  │ Credential                 │ Credential
 │             ▼                            │
 │     ┌───────────────┐                    │
 └─────┤   SUSPENDED   ├───────────────┐    │
       └───────────────┘               │    │
                                       ▼    ▼
                               ┌─────────────────┐
                               │     REVOKED     │  ◄── Terminal State
                               │  (Irreversible) │
                               └─────────────────┘
```

### Guardrails yang Divalidasi:
1. **Otorisasi Role**: Hanya Issuer yang menerbitkan kredensial bersangkutan atau Governance Admin yang berhak memanggil fungsi perubahan status.
2. **Terminal Inviolability**: Sekali kredensial masuk ke status `REVOKED`, kredensial **tidak dapat diaktifkan kembali (`ACTIVE`)** dan **tidak dapat di-suspend ulang**. Upaya perubahan akan me-revert dengan `CredentialAlreadyRevoked`.
3. **Validasi Transisi Status**:
   - Reaktivasi hanya sah jika status sebelumnya adalah `SUSPENDED` (mencegah reaktivasi kredensial `ACTIVE`).
   - Penangguhan hanya sah jika status sebelumnya adalah `ACTIVE` (mencegah double-suspend).
4. **Isolasi Cross-Issuer**: Issuer B tidak memiliki izin untuk menangguhkan atau mencabut kredensial yang diterbitkan oleh Issuer A.

---

## 3. Matriks Hasil Pengujian Lifecycle (Integration Test Suite)

| ID | Skenario Uji | Status Awal | Aksi / Pemanggil | Status Akhir | Hasil Revert / Event | Status Test |
|---|---|---|---|---|---|---|
| **M5-01a** | Penangguhan Kredensial | `ACTIVE` | `suspendCredential` oleh Issuer A | `SUSPENDED` | Event `CredentialStatusChanged` (ACTIVE &rarr; SUSPENDED) | **PASS** |
| **M5-01b** | Reaktivasi Kredensial | `SUSPENDED` | `reactivateCredential` oleh Issuer A | `ACTIVE` | Event `CredentialStatusChanged` (SUSPENDED &rarr; ACTIVE) | **PASS** |
| **M5-01c** | Pencabutan Permanen | `ACTIVE` | `revokeCredential` oleh Issuer A | `REVOKED` | Event `CredentialStatusChanged` (ACTIVE &rarr; REVOKED) | **PASS** |
| **M5-02a** | Reaktivasi Kredensial Revoked | `REVOKED` | `reactivateCredential` oleh Issuer A | `REVOKED` | Revert `CredentialAlreadyRevoked` | **PASS** |
| **M5-02b** | Suspend Kredensial Revoked | `REVOKED` | `suspendCredential` oleh Issuer A | `REVOKED` | Revert `CredentialAlreadyRevoked` | **PASS** |
| **M5-02c** | Revoke Kredensial Revoked | `REVOKED` | `revokeCredential` oleh Issuer A | `REVOKED` | Revert `CredentialAlreadyRevoked` | **PASS** |
| **M5-03a** | Reaktivasi Kredensial Aktif | `ACTIVE` | `reactivateCredential` oleh Issuer A | `ACTIVE` | Revert `InvalidStateTransition` | **PASS** |
| **M5-03b** | Suspend Kredensial Suspended | `SUSPENDED` | `suspendCredential` oleh Issuer A | `SUSPENDED` | Revert `InvalidStateTransition` | **PASS** |
| **M5-04a** | Serangan Status Pihak Luar | `ACTIVE` | `suspend/revoke` oleh Akun Penyerang | `ACTIVE` | Revert `UnauthorizedCaller` | **PASS** |
| **M5-04b** | Serangan Antar-Issuer (Cross-Issuer) | `ACTIVE` | `revokeCredential` milik A oleh Issuer B | `ACTIVE` | Revert `UnauthorizedCaller` | **PASS** |
| **M5-04c** | Intervensi Admin Governance | `ACTIVE` | `revokeCredential` oleh Admin | `REVOKED` | Berhasil (Admin Governance Override) | **PASS** |
| **M5-05** | Rekonstruksi Audit Trail (FR-10) | Variabel | Multi-step lifecycle (Suspend &rarr; Reactivate &rarr; Revoke) | `REVOKED` | Riwayat 3 event lengkap tercatat di log blockchain | **PASS** |

---

## 4. Log Eksekusi Uji Integrasi M5

```text
> npx hardhat test tests/integration/Lifecycle.integration.test.ts

  Milestone 5 (M5) - Credential Lifecycle & State Machine Integration Tests
    M5-01: Alur Lengkap State Machine (ACTIVE -> SUSPENDED -> ACTIVE -> REVOKED)
      √ Harus dapat menangguhkan kredensial aktif menjadi SUSPENDED (82ms)
      √ Harus dapat mereaktivasi kredensial dari SUSPENDED kembali menjadi ACTIVE (50ms)
      √ Harus dapat mencabut kredensial secara permanen (REVOKED) (48ms)
    M5-02: Terminal State Inviolability (Revocation Irreversible)
      √ Harus menolak upaya reaktivasi pada kredensial yang sudah REVOKED
      √ Harus menolak upaya suspend pada kredensial yang sudah REVOKED
      √ Harus menolak upaya pencabutan ulang pada kredensial yang sudah REVOKED
    M5-03: Validasi Transisi Status Tidak Sah (Invalid Transitions)
      √ Harus menolak reaktivasi kredensial yang sudah berstatus ACTIVE
      √ Harus menolak suspend kredensial yang sudah berstatus SUSPENDED
    M5-04: Kontrol Hak Akses (Role-Based Authorization)
      √ Harus menolak jika akun unauthorized mencoba mengubah status kredensial
      √ Harus menolak isolasi Cross-Issuer: Issuer B TIDAK BISA mencabut kredensial Issuer A
      √ Admin Governance DIIZINKAN mencabut kredensial jika terjadi pelanggaran protokol
    M5-05: Emisi Event On-Chain & Rekonstruksi Audit Trail (FR-10)
      √ Harus mencatat seluruh riwayat siklus hidup dalam Audit Trail blockchain (84ms)

  12 passing (2s)
```

---

## 5. Ringkasan Implementasi API & Layanan M5
1. **Service**: [`apps/api/src/services/lifecycle.service.ts`](file:///c:/Users/Administrator/Documents/Block%20chain/UTS/apps/api/src/services/lifecycle.service.ts)
   - `suspendCredential(credentialId, reasonRef, signer)`
   - `reactivateCredential(credentialId, signer)`
   - `revokeCredential(credentialId, reasonRef, signer)`
   - `getCredentialStatus(credentialId)`
   - `getAuditHistory(credentialId)`
2. **Endpoints API**: [`apps/api/src/app.ts`](file:///c:/Users/Administrator/Documents/Block%20chain/UTS/apps/api/src/app.ts)
   - `POST /api/credentials/:id/suspend`
   - `POST /api/credentials/:id/reactivate`
   - `POST /api/credentials/:id/revoke`
   - `GET /api/credentials/:id/status`
   - `GET /api/audit/:credentialId`
