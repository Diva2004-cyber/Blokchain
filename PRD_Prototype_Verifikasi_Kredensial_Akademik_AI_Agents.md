---
title: "PRD — Prototype Verifikasi Kredensial Akademik"
purpose: "Source of truth untuk AI coding agents di Antigravity IDE"
project_type: "UTS Blockchain — Project-Based"
status: "Prototype specification"
---

PRODUCT REQUIREMENTS DOCUMENT

# Prototype Sistem Verifikasi
Kredensial Akademik Berbasis Blockchain

AI Agent Implementation PRD

Version 1.0  |  6 Oktober 2026  |  Status: Draft for Implementation

| Tujuan dokumen<br>Menjadi kontrak kerja yang dapat dibaca manusia dan AI coding agents untuk membangun, menguji, dan mendokumentasikan prototype verifikasi kredensial akademik. Dokumen ini mengubah keputusan desain STEP 1–6 menjadi backlog implementasi yang dapat dieksekusi dan diverifikasi. |
| --- |

Untuk penggunaan akademik / prototipe lokal. Bukan sistem produksi.

# 0. Document Control

| Item | Isi |
| --- | --- |
| Product | Academic Credential Verification Prototype |
| PRD purpose | Single source of truth untuk AI agents + developer |
| Target environment | Windows host + Antigravity IDE; local/sandboxed blockchain |
| Primary deployment mode | Local development / simulation |
| Primary blockchain runtime | EVM-local for functional testing; Besu QBFT for consortium simulation |
| Data policy | 100% synthetic data; tidak ada PII nyata / private key produksi |
| Status | Ready for implementation with staged validation |
| Out of scope | Mainnet, production identity system, real university integration |

# 1. Executive Summary

Masalah. Verifikasi kredensial akademik memerlukan kepastian mengenai kewenangan penerbit, integritas informasi, status keberlakuan, dan hubungan kredensial dengan pemilik. Rancangan diposisikan untuk mempercepat verifikasi dan menyediakan jejak audit bersama, tanpa menjadikan blockchain sebagai sumber kebenaran akademik.

Solusi. Sistem menggunakan model issuer-holder-verifier dengan Verifiable Credential, registry pada blockchain permissioned, dan data akademik sensitif di off-chain storage. Prototype membuktikan issuance, commitment anchoring, verification, status change/revocation, tamper detection, access control, dan replay resistance.

| Prinsip utama<br>Konsensus menyepakati perubahan ledger; issuer tetap bertanggung jawab atas kebenaran akademik. Blockchain dipakai ketika beberapa organisasi membutuhkan audit bersama dan pembagian kewenangan. Jika hanya ada satu otoritas, database konvensional dengan tanda tangan digital dan audit log dapat lebih proporsional. |
| --- |

# 2. Source of Truth & Design Basis

| Sumber | Digunakan untuk |
| --- | --- |
| UTS Blockchain OBE 2026/2027 | P1–P6, format, requirement prototype, pengujian, acceptance, dan batasan tugas. |
| Buku Bahan Ajar Blockchain | SSI/DID/VC, credential lifecycle, nonce/audience/expiry, threat model, recovery, privacy, dan praktikum sintetis. |
| W3C Verifiable Credentials Data Model v2.0 | Model issuer-holder-verifier, credential fields, status, privacy/data minimization. |
| Hyperledger Besu documentation | Private/permissioned network dan QBFT untuk simulasi konsorsium. |
| Hardhat documentation | Compile, unit/integration testing, fuzzing/invariant testing, dan TypeScript workflow. |
| Node.js official release | Baseline Node.js 24.19.0 LTS yang kompatibel dengan project baseline. |

# 3. Product Goals

## 3.1 Goals

Menyediakan alur end-to-end: issuer menerbitkan credential, holder menyimpan/mempresentasikan, verifier melakukan pemeriksaan.

Memisahkan data akademik sensitif dari metadata/commitment yang perlu di-anchor ke ledger.

Membuktikan perubahan status credential: ACTIVE, SUSPENDED, REVOKED sesuai otoritas.

Menyediakan bukti integritas melalui signature dan commitment/hash.

Menguji kontrol keamanan utama: unauthorized issue/revoke, tampering, replay, issuer trust, expiry, dan holder binding.

Menyediakan artefak reproduksi: source code, test results, transaction hash, contract address, screenshot, dan README.

## 3.2 Non-goals

Tidak menjadi layanan identitas produksi atau pengganti sistem akademik kampus.

Tidak menggunakan mainnet, aset bernilai, wallet utama, atau private key produksi.

Tidak menyimpan NIK, biometrik, transcript lengkap, atau PII sensitif on-chain.

Tidak membuktikan legal compliance atau keamanan absolut.

Tidak membangun Bitcoin analysis stack karena bukan kebutuhan inti use case.

# 4. Users, Roles, and Responsibilities

| Role | Primary responsibility | Key permissions |
| --- | --- | --- |
| Issuer | Menerbitkan dan mengubah status credential | Register issuer, issue, suspend/revoke, recover via controlled process |
| Holder | Menyimpan credential dan menyetujui disclosure | Store, present, approve attributes, initiate recovery |
| Verifier | Memeriksa credential untuk tujuan tertentu | Request verification, validate proof/status/policy |
| Validator operator | Menjalankan node konsorsium | Participate in consensus; no automatic academic authority |
| Governance admin | Mengelola onboarding, policy, upgrades | Change approved governance state with multi-party control |
| Recovery officer | Memproses key/device recovery | Verify identity and execute approved recovery process |
| Auditor | Meninjau evidence dan state change | Read audit evidence; no issuance authority by default |

# 5. Product Architecture

User Layer

Issuer Portal       Holder Wallet        Verifier Portal

|                    |                    |

+--------------------+--------------------+

|

API / Application

|

+--------------+--------------+

|                             |

Credential Service            Verification Service

|                             |

+--------------+--------------+

|

+------------+------------+

|                         |

EVM Local Chain             Besu QBFT

(functional test)       (consortium simulation)

|                         |

CredentialRegistry        4 validator nodes

|

Off-chain storage (encrypted/sandboxed)

| Architecture rule<br>Ganache/Hardhat local EVM digunakan untuk rapid development dan deterministic testing. Besu QBFT digunakan sebagai secondary validation environment untuk menunjukkan pola permissioned consortium. Jangan menjalankan kedua chain sebagai sumber state yang sama. |
| --- |

# 6. Technology Stack & Environment

| Layer | Baseline | Why / usage |
| --- | --- | --- |
| IDE | Antigravity IDE | Primary coding workspace and AI agent orchestration. |
| OS | Windows 10 host | Primary development environment. |
| Runtime | Node.js 24.19.0 LTS | Runtime for TypeScript/scripts; pinned baseline for reproducibility. |
| Language | TypeScript | Application, scripts, tests, simulation tooling. |
| Frontend | React + Next.js | Issuer/Holder/Verifier portal prototype. |
| Smart contract | Solidity 0.8.30 | Credential registry contract. |
| EVM client | ethers.js 6.15.0 | Provider, wallet, signing, contract interaction. |
| Local EVM | Ganache 7.9.2 or Hardhat simulated network | Fast local execution; choose one primary to avoid duplicated configuration. |
| Consortium simulation | Hyperledger Besu + QBFT | Permissioned multi-validator simulation. |
| Testing | Hardhat 3 + TypeScript/Solidity tests | Unit, integration, fuzz/invariant, gas/evidence. |
| Version control | Git | Change tracking, rollback, evidence. |
| Package manager | npm | Dependency installation and scripts. |

Version note: Node.js 24.19.0 was released as LTS on 3 August 2026. Hardhat 3 supports Solidity and TypeScript testing, including fuzzing/invariant testing. Ganache is treated as a compatibility baseline/local tool rather than the strategic blockchain layer. See References for official documentation.

# 7. Functional Requirements

| ID | Requirement | Acceptance intent | Actor |
| --- | --- | --- | --- |
| FR-01 | Issuer registration | System stores issuer identifier, institution name, authorization/status, verification method. | Issuer admin |
| FR-02 | Credential issuance | Authorized issuer creates a signed credential matching schema. | Issuer |
| FR-03 | Commitment anchoring | System writes credentialId + commitment + status + issuer reference to registry. | System |
| FR-04 | Holder storage | Holder can store a synthetic credential and metadata locally. | Holder |
| FR-05 | Verification request | Verifier creates request with purpose, nonce, audience, and expiry. | Verifier |
| FR-06 | Presentation | Holder approves and presents only requested/minimal attributes. | Holder |
| FR-07 | Verification | Verifier checks signature, issuer trust, commitment, status, expiry, nonce/audience, and holder binding when used. | Verifier |
| FR-08 | Status management | Authorized issuer can suspend, reactivate, or revoke according to policy. | Issuer |
| FR-09 | Tamper detection | Modified credential data fails proof/commitment verification. | Verifier |
| FR-10 | Audit evidence | System exposes auditable state changes without storing secrets. | Auditor |

# 8. Data Model

## 8.1 Credential schema (logical)

| Field | Location | Sensitivity | Purpose |
| --- | --- | --- | --- |
| id / credentialId | On-chain reference + VC | Low/Identifier | Stable credential reference. |
| type | VC/off-chain | Low | Credential class/schema. |
| issuer | VC/off-chain + issuer registry ref | Medium | Binds credential to authorized issuer. |
| validFrom / validUntil | VC; optionally metadata on-chain | Medium | Validity window. |
| credentialSubject | Off-chain / holder wallet | High | Academic attributes and subject claims. |
| credentialSchema | VC/off-chain | Low | Schema validation. |
| credentialStatus | Registry + VC reference | Medium | Active/suspended/revoked state. |
| proof | VC | High/cryptographic | Issuer signature/proof. |
| commitment | On-chain | Low | Integrity anchor for off-chain credential. |

Data rule: Full academic record (name, student ID, program, GPA, transcript, diploma document, salt/secret) remains off-chain. Only the minimum registry information required for integrity, status, issuer trust, and auditability is anchored. Hashing does not automatically make guessable personal data anonymous.

## 8.2 Credential status state machine

ACTIVE ───────────────► REVOKED

│                         ▲

│                         │

▼                         │

SUSPENDED ─────────────► ACTIVE   (reactivation allowed by policy)

Guardrails:

- only authorized issuer/recovery role can change status

- every state change emits an auditable event

- revoked is terminal unless governance explicitly defines otherwise

# 9. Smart Contract Requirements

## 9.1 Contract

CredentialRegistry

registerIssuer(issuerId, verificationMethod)

issueCredential(credentialId, issuerId, commitment, schemaVersion, validUntil)

suspendCredential(credentialId, reasonRef)

reactivateCredential(credentialId)

revokeCredential(credentialId, reasonRef)

getCredential(credentialId)

getIssuer(issuerId)

events: IssuerRegistered, CredentialIssued, CredentialStatusChanged

## 9.2 Contract security requirements

Role-based authorization: unauthorized accounts must revert for protected state-changing methods.

Input validation: reject empty IDs, zero/invalid issuer references, duplicate credential IDs, and invalid state transitions.

Checks-effects-interactions: no untrusted external call before critical state update; current MVP contract should avoid unnecessary external calls.

No secret material in contract storage or event payload.

Events contain audit-relevant state changes but must not contain PII beyond the approved reference.

Contract address and deployed bytecode artifact must be recorded for reproducibility.

# 10. End-to-End Credential Lifecycle

1. Issuer validates synthetic academic source data.

2. Application creates VC payload + schemaVersion + validity window.

3. Issuer signs credential/proof.

4. System stores full credential off-chain / holder wallet.

5. System computes commitment and anchors registry state on chain.

6. Holder receives/stores credential.

7. Verifier creates request: purpose + nonce + audience + expiry + minimum attributes.

8. Holder approves and presents requested claims.

9. Verifier checks proof + issuer + status + expiry + nonce/audience + binding + policy.

10. Verification result records minimum necessary evidence.

# 11. Backend/API Contract

| Method | Endpoint | Purpose | Auth / control |
| --- | --- | --- | --- |
| POST | /api/issuers | Register issuer | Issuer admin |
| POST | /api/credentials/issue | Create/sign/anchor credential | Issuer role |
| GET | /api/credentials/:id | Retrieve allowed credential metadata | Authorized caller |
| POST | /api/presentations/request | Create verification request | Verifier |
| POST | /api/presentations/verify | Verify holder presentation | Verifier |
| POST | /api/credentials/:id/suspend | Suspend credential | Issuer/recovery policy |
| POST | /api/credentials/:id/reactivate | Reactivate credential | Issuer/recovery policy |
| POST | /api/credentials/:id/revoke | Revoke credential | Issuer/recovery policy |
| GET | /api/audit/:credentialId | Retrieve minimal audit evidence | Auditor/authorized role |
| GET | /api/health | Health check | Public local endpoint |

| API rule<br>All state-changing endpoints must validate authorization at the application layer and again at the smart contract layer. Never trust the frontend as an authorization boundary. |
| --- |

# 12. Frontend / Wireframe Requirements

| Screen | Must show | Must not expose |
| --- | --- | --- |
| Issuer Dashboard | Issuer status, issue form, credential status, transaction hash | Private keys, seed phrase, raw secrets |
| Credential Detail | Credential ID, status, issuer, validity, proof/verification state | Unnecessary PII |
| Holder Wallet | Synthetic credential list, presentation consent, requested attributes | Backend admin controls |
| Verifier Portal | Purpose/request, required attributes, verify button, result + reason | Unrequested sensitive attributes |
| Audit View | Status history, timestamps, tx hashes, contract address | Secrets / raw credentials unless authorized |

# 13. Security & Privacy Requirements

| Threat | Required control | Evidence |
| --- | --- | --- |
| Issuer impersonation | Issuer registry + authorization + trusted verification method | Unauthorized issuer test |
| Issuer key theft | Secure local key handling, rotation/revocation procedure, never commit secrets | Secret scan + recovery note |
| Holder device/key loss | Controlled recovery + re-issuance path | Recovery test / sequence |
| Credential tampering | Digital signature + commitment/hash verification | Tampered credential test |
| Replay | Nonce + audience + expiry + request binding | Replay rejection test |
| Privacy leakage | Selective disclosure/minimum attributes + off-chain sensitive data | Disclosure comparison |
| Unauthorized status change | Role-based contract access control + audit event | Negative access test |
| Node/RPC disruption | Timeout/error handling + read fallback for prototype | Failure-mode test |

Residual risk. Issuer can still provide incorrect academic facts; a legitimate verifier can retain disclosed data; endpoint compromise can affect user actions; metadata can enable correlation; and collusion among trusted authorities remains a governance risk.

# 14. Testing Strategy

## 14.1 Test layers

| Layer | Tool | Scope |
| --- | --- | --- |
| Contract unit | Hardhat / Solidity tests | Authorization, state transitions, duplicate IDs, inputs, events |
| Contract property/fuzz | Hardhat Solidity fuzz/invariant | Core state invariants and unexpected input combinations |
| Integration | TypeScript + ethers | API → contract → event → readback |
| E2E | Playwright or equivalent (optional) | Issuer → Holder → Verifier UI flow |
| Security negative tests | TypeScript | Unauthorized issue/revoke, tamper, replay, wrong issuer, expired VC |
| Performance | Node/TypeScript benchmark | Verification latency and throughput under synthetic load |

## 14.2 Mandatory acceptance tests

| ID | Scenario | Pass condition |
| --- | --- | --- |
| AT-01 | Authorized issuer issues credential | Transaction succeeds; event emitted; registry state ACTIVE |
| AT-02 | Verifier checks valid credential | Result = VERIFIED |
| AT-03 | Modify one academic attribute | Verification result = INVALID |
| AT-04 | Unauthorized account tries issue | Transaction reverts |
| AT-05 | Unauthorized account tries revoke | Transaction reverts |
| AT-06 | Revoked credential verified | Result = REVOKED / rejected |
| AT-07 | Expired credential verified | Result = EXPIRED / rejected |
| AT-08 | Replay same presentation | Second use rejected when one-time nonce policy is active |
| AT-09 | Wrong issuer | Verification rejected |
| AT-10 | Node/RPC unavailable | UI/API returns controlled error; no false VERIFIED result |

# 15. Performance & Acceptance Targets

Primary objective is not to claim production performance. Prototype measurements are configuration-specific and must report machine, Node version, chain type, dataset size, sample count, warm-up, and measurement method.

| Metric | Target for prototype | Reporting rule |
| --- | --- | --- |
| Verification P95 | ≤ 3 seconds | Local controlled environment; report n and conditions |
| Issuance finality P95 | ≤ 5 seconds | Local chain/Besu test conditions; do not generalize |
| Tamper detection | 100% of injected modifications in test set | Document mutation strategy |
| Unauthorized state changes | 0 accepted attempts | Report total attempted/blocked |
| Secret leakage | 0 secrets committed / rendered | Run secret scan + manual review |

# 16. AI Agent Operating Contract

| Agent role<br>AI agents are implementation assistants operating under this PRD. They may write code, tests, configs, docs, and mock data, but must not silently change architecture, claim unexecuted results, or introduce production-risk integrations. |
| --- |

## 16.1 Agent roles

| Agent | Primary responsibility | Outputs |
| --- | --- | --- |
| Architect Agent | Maintain boundaries, ADRs, module contracts, data flow | Architecture notes, decision records |
| Smart Contract Agent | Implement Solidity registry and tests | Contract, unit tests, deployment script |
| Backend Agent | Implement API and off-chain services | Routes, validation, service layer, tests |
| Frontend Agent | Implement portal/wallet/verifier UI | Pages, forms, verification states |
| Security/QA Agent | Threat-driven negative tests and secret checks | Security tests, findings, remediation |
| Documentation Agent | README, evidence map, demo script, report-ready tables | Docs/evidence index |

## 16.2 Mandatory agent behavior

Read this PRD before modifying the project.

Inspect existing code and package versions before adding or replacing dependencies.

Prefer the smallest change that satisfies the requirement.

Do not upgrade major dependencies without explicit decision and compatibility check.

Write tests before declaring a feature complete.

Run relevant tests/lint/typecheck after each meaningful change.

Never hard-code or commit private keys, seed phrases, API tokens, cookies, or production credentials.

Use only synthetic credential data.

Do not fabricate transaction hashes, performance numbers, screenshots, or test results.

When a requirement is ambiguous and affects architecture/security, stop and document the ambiguity instead of inventing behavior.

Keep a concise change log/ADR for decisions that alter boundaries or protocols.

## 16.3 Agent task protocol

Understand: identify requirement IDs affected (e.g., FR-07, AT-03).

Plan: list files/modules to change and risks. Do not code yet for cross-cutting changes.

Implement: make the smallest coherent change.

Validate: run tests, typecheck, lint, and targeted manual checks.

Evidence: record command, result, transaction hash/contract address where applicable.

Report: summarize changed files, tests run, result, unresolved issues, and next step.

# 17. Repository Structure

academic-credential-blockchain/

├─ apps/

│  ├─ portal/                 # React/Next.js UI

│  └─ api/                    # Node/TypeScript API

├─ contracts/

│  ├─ CredentialRegistry.sol

│  └─ interfaces/

├─ blockchain/

│  ├─ hardhat.config.ts

│  ├─ scripts/

│  └─ test/

├─ network/

│  └─ besu-qbft/              # optional/secondary simulation

├─ data/

│  └─ synthetic/

├─ tests/

│  ├─ security/

│  ├─ integration/

│  └─ performance/

├─ docs/

│  ├─ architecture/

│  ├─ adr/

│  └─ evidence/

├─ scripts/

├─ .env.example

├─ .gitignore

├─ README.md

└─ package.json

# 18. Implementation Milestones

| Milestone | Scope | Definition of done |
| --- | --- | --- |
| M0 | Environment | Node, npm, Git, IDE; project runs locally. |
| M1 | Repo + schema | Monorepo structure, synthetic dataset, VC schema documented. |
| M2 | Contract | Registry compiles; unit/security tests pass. |
| M3 | Issuance | Issuer can create signed VC + anchor commitment/status. |
| M4 | Verification | Verifier accepts valid VC and rejects tampered/wrong issuer/expired. |
| M5 | Lifecycle | Suspend/reactivate/revoke works with role control and events. |
| M6 | Portal | Issuer/Holder/Verifier UI completes end-to-end local flow. |
| M7 | Security QA | Threat-driven negative tests pass; secret scan clean. |
| M8 | Performance + evidence | Benchmark and evidence pack generated; README reproducible. |
| M9 | Besu simulation | QBFT consortium demo run or documented fallback if hardware constraints prevent it. |

# 19. Expected Developer Commands

# install

npm install

# build / typecheck

npm run build

npm run typecheck

# tests

npm test

npm run test:security

npm run test:integration

# local app

npm run dev

# contract tasks

npx hardhat build

npx hardhat test

npx hardhat test --test-profile ci

# 20. Evidence & Reproducibility

| Evidence ID | Minimum content |
| --- | --- |
| E-01 Environment | OS, Node/npm, Git, package versions |
| E-02 Contract | Compiled artifact, deployed address, chain ID |
| E-03 Issuance | Input fixture, tx hash, event, resulting status |
| E-04 Verification-valid | Valid credential result + checks summary |
| E-05 Verification-invalid | Tampered/wrong issuer/expired/revoked examples |
| E-06 Access-control | Unauthorized transaction reversion |
| E-07 Replay | Nonce/audience/expiry rejection |
| E-08 Performance | Raw measurement + environment + p50/p95 |
| E-09 Security scan | Secret scan/lint/test output |
| E-10 Besu (optional/secondary) | Validator health + consensus/network evidence |

# 21. Implementation Risks & Fallbacks

| Risk | Trigger | Fallback |
| --- | --- | --- |
| Windows resource limitation | Besu multi-validator causes instability | Use Ganache/Hardhat as primary functional chain and document Besu limitation. |
| Dependency conflict | Node/Hardhat/ethers mismatch | Pin versions and restore lockfile; avoid unplanned upgrades. |
| UI scope creep | Backend/contract is not stable | Freeze UI to wireframe-level interactions until core flow passes. |
| Crypto interoperability issue | Different signing/encoding assumptions | Fix canonical serialization and test vectors before integration. |
| False security claim | Test coverage incomplete | Downgrade wording to “tested in prototype” and document residual risk. |

# 22. Global Definition of Done

Functional flow Issue → Store → Present → Verify → Status Change completes locally with synthetic data.

At least 10 acceptance/security scenarios are implemented and passed or have a documented, reproducible failure.

Smart contract protected methods reject unauthorized callers.

Credential tampering is detected in automated tests.

Replay resistance is demonstrated with nonce/audience/expiry.

No real PII, secret keys, seed phrases, or production credentials are present in repository history.

README can reproduce setup and demo from a clean environment using pinned dependencies.

Evidence artifacts map back to FR/AT IDs and contain timestamps/environment context.

Performance results are clearly labeled as local prototype measurements, not production guarantees.

Architecture deviations are documented in ADR/changelog before implementation is considered complete.

# 23. AI Agent Bootstrap Prompt

| Paste this into the coding agent at project start<br>You are implementing the Academic Credential Verification Prototype according to PRD version 1.0. Treat the PRD as the source of truth. First inspect the repository and report: (1) current files, (2) Node/package versions, (3) existing apps/contracts, (4) tests, and (5) deviations from PRD. Do not install or upgrade dependencies yet. Then propose the smallest implementation plan for M0–M2. Do not use real personal data, production keys, mainnet, or external paid services. Do not fabricate results. Every completed requirement must reference its FR/AT ID and include the test command/result and evidence path. If an architecture-changing decision is needed, stop and present the decision, options, trade-off, and recommended choice before coding. |
| --- |

# 24. References

UTS Blockchain OBE | Naskah Peserta | Tahun Akademik 2026/2027. Internal course document.

Buku Bahan Ajar Mata Kuliah Blockchain — Nur Widiyasono. Internal course material.

W3C, Verifiable Credentials Data Model v2.0. https://www.w3.org/TR/vc-data-model/

W3C, Threat Model for Decentralized Credentials. https://www.w3.org/TR/2026/DNOTE-threat-model-decentralized-credentials-20260529/

Hyperledger Besu, Private Networks / QBFT documentation. https://docs.besu-eth.org/private-networks

Hardhat 3, Testing Overview. https://hardhat.org/docs/guides/testing

Node.js, v24.19.0 LTS release. https://nodejs.org/id/blog/release/v24.19.0

Solidity, Version 0.8.30 release announcement. https://www.soliditylang.org/blog/2025/05/07/solidity-0.8.30-release-announcement/

ethers.js documentation. https://docs.ethers.org/

Ganache package/documentation. https://www.npmjs.com/package/ganache

| Implementation philosophy<br>Build the smallest end-to-end proof first. Expand only when the previous layer is tested and evidenced. The prototype is successful when its behavior is demonstrable, reproducible, and honestly scoped—not when it contains the largest number of technologies. |
| --- |
