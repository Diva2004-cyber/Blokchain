import { expect } from "chai";
import { ethers } from "hardhat";
import { CredentialRegistry } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { IssuanceService } from "../../apps/api/src/services/issuance.service";
import { LifecycleService } from "../../apps/api/src/services/lifecycle.service";
import { VerificationService } from "../../apps/api/src/services/verification.service";
import { IssuerInfo } from "../../apps/api/src/types/credential";
import * as fixtures from "../../data/synthetic/academic_credentials_fixtures.json";

describe("Milestone 5 (M5) - Credential Lifecycle & State Machine Integration Tests", function () {
  let registry: CredentialRegistry;
  let admin: HardhatEthersSigner;
  let issuerASigner: HardhatEthersSigner;
  let issuerBSigner: HardhatEthersSigner;
  let unauthorizedSigner: HardhatEthersSigner;

  let issuanceService: IssuanceService;
  let lifecycleService: LifecycleService;
  let verificationService: VerificationService;

  const issuerAInfo: IssuerInfo = {
    id: "did:web:uis.ac.id",
    name: "Universitas Indonesia Sintetis",
    ethereumAddress: "",
    verificationMethod: "did:web:uis.ac.id#key-1",
  };

  const issuerBInfo: IssuerInfo = {
    id: "did:web:itbs.ac.id",
    name: "Institut Teknologi Bandung Sintetis",
    ethereumAddress: "",
    verificationMethod: "did:web:itbs.ac.id#key-1",
  };

  let credentialId: string;
  let credentialIdOnChain: string;
  let issuedVc: any;

  beforeEach(async function () {
    [admin, issuerASigner, issuerBSigner, unauthorizedSigner] = await ethers.getSigners();
    issuerAInfo.ethereumAddress = issuerASigner.address;
    issuerBInfo.ethereumAddress = issuerBSigner.address;

    // 1. Deploy Contract
    const RegistryFactory = await ethers.getContractFactory("CredentialRegistry");
    registry = (await RegistryFactory.deploy()) as unknown as CredentialRegistry;
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();

    // 2. Register Issuer A & Issuer B on-chain
    await registry.connect(admin)["registerIssuer(string,address,string)"](
      issuerAInfo.id,
      issuerASigner.address,
      issuerAInfo.verificationMethod!
    );

    await registry.connect(admin)["registerIssuer(string,address,string)"](
      issuerBInfo.id,
      issuerBSigner.address,
      issuerBInfo.verificationMethod!
    );

    // 3. Initialize Services
    issuanceService = new IssuanceService({
      registryContract: registry as any,
      issuerSigner: issuerASigner,
      registryAddress,
    });

    lifecycleService = new LifecycleService({
      registryContract: registry as any,
      defaultSigner: issuerASigner,
    });

    verificationService = new VerificationService({
      registryContract: registry as any,
    });

    // 4. Issue SCN-VALID-01 by Issuer A
    const fixture1 = (fixtures as any)[0];
    credentialId = fixture1.credential.id;

    const issueResult = await issuanceService.issueAndAnchorCredential(
      {
        issuerId: issuerAInfo.id,
        credentialSubject: fixture1.credential.credentialSubject,
        validFrom: fixture1.credential.validFrom,
        validUntil: fixture1.credential.validUntil,
        customId: credentialId,
      },
      issuerAInfo
    );

    credentialIdOnChain = issueResult.credentialIdOnChain;
    issuedVc = issueResult.credential;
  });

  describe("M5-01: Alur Lengkap State Machine (ACTIVE -> SUSPENDED -> ACTIVE -> REVOKED)", function () {
    it("Harus dapat menangguhkan kredensial aktif menjadi SUSPENDED", async function () {
      const result = await lifecycleService.suspendCredential(
        credentialId,
        "Investigasi administratif integritas berkas"
      );

      expect(result.success).to.be.true;
      expect(result.previousStatus).to.equal("ACTIVE");
      expect(result.newStatus).to.equal("SUSPENDED");
      expect(result.transactionHash).to.be.properHex(64);

      // Verifikasi status on-chain
      const statusInfo = await lifecycleService.getCredentialStatus(credentialId);
      expect(statusInfo.status).to.equal("SUSPENDED");

      // Verifikasi verifier menolak kredensial yang berstatus SUSPENDED
      const verifyResult = await verificationService.verifyCredential(issuedVc);
      expect(verifyResult.isValid).to.be.false;
      expect(verifyResult.status).to.equal("SUSPENDED");
    });

    it("Harus dapat mereaktivasi kredensial dari SUSPENDED kembali menjadi ACTIVE", async function () {
      // Suspend dulu
      await lifecycleService.suspendCredential(credentialId, "Investigasi sementara");

      // Reaktivasi
      const reactivateResult = await lifecycleService.reactivateCredential(credentialId);
      expect(reactivateResult.success).to.be.true;
      expect(reactivateResult.previousStatus).to.equal("SUSPENDED");
      expect(reactivateResult.newStatus).to.equal("ACTIVE");

      // Verifikasi status on-chain
      const statusInfo = await lifecycleService.getCredentialStatus(credentialId);
      expect(statusInfo.status).to.equal("ACTIVE");

      // Verifikasi bahwa kredensial kembali sah bagi verifier
      const verifyResult = await verificationService.verifyCredential(issuedVc);
      expect(verifyResult.status).to.equal("ACTIVE");
    });

    it("Harus dapat mencabut kredensial secara permanen (REVOKED)", async function () {
      const result = await lifecycleService.revokeCredential(
        credentialId,
        "Putusan sidang etik akademik tetap"
      );

      expect(result.success).to.be.true;
      expect(result.previousStatus).to.equal("ACTIVE");
      expect(result.newStatus).to.equal("REVOKED");

      const statusInfo = await lifecycleService.getCredentialStatus(credentialId);
      expect(statusInfo.status).to.equal("REVOKED");

      // Verifikasi penolakan oleh verifier
      const verifyResult = await verificationService.verifyCredential(issuedVc);
      expect(verifyResult.isValid).to.be.false;
      expect(verifyResult.status).to.equal("REVOKED");
    });
  });

  describe("M5-02: Terminal State Inviolability (Revocation Irreversible)", function () {
    beforeEach(async function () {
      // Cabut kredensial permanen terlebih dahulu
      await lifecycleService.revokeCredential(credentialId, "Dicabut permanen");
    });

    it("Harus menolak upaya reaktivasi pada kredensial yang sudah REVOKED", async function () {
      await expect(
        lifecycleService.reactivateCredential(credentialId)
      ).to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked");
    });

    it("Harus menolak upaya suspend pada kredensial yang sudah REVOKED", async function () {
      await expect(
        lifecycleService.suspendCredential(credentialId, "Coba suspend ulang")
      ).to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked");
    });

    it("Harus menolak upaya pencabutan ulang pada kredensial yang sudah REVOKED", async function () {
      await expect(
        lifecycleService.revokeCredential(credentialId, "Coba revoke ulang")
      ).to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked");
    });
  });

  describe("M5-03: Validasi Transisi Status Tidak Sah (Invalid Transitions)", function () {
    it("Harus menolak reaktivasi kredensial yang sudah berstatus ACTIVE", async function () {
      await expect(
        lifecycleService.reactivateCredential(credentialId)
      ).to.be.revertedWithCustomError(registry, "InvalidStateTransition");
    });

    it("Harus menolak suspend kredensial yang sudah berstatus SUSPENDED", async function () {
      await lifecycleService.suspendCredential(credentialId, "Penangguhan pertama");

      await expect(
        lifecycleService.suspendCredential(credentialId, "Penangguhan kedua")
      ).to.be.revertedWithCustomError(registry, "InvalidStateTransition");
    });
  });

  describe("M5-04: Kontrol Hak Akses (Role-Based Authorization)", function () {
    it("Harus menolak jika akun unauthorized mencoba mengubah status kredensial", async function () {
      await expect(
        lifecycleService.suspendCredential(
          credentialId,
          "Penyerang mencoba suspend",
          unauthorizedSigner
        )
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller");

      await expect(
        lifecycleService.revokeCredential(
          credentialId,
          "Penyerang mencoba revoke",
          unauthorizedSigner
        )
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller");
    });

    it("Harus menolak isolasi Cross-Issuer: Issuer B TIDAK BISA mencabut kredensial Issuer A", async function () {
      await expect(
        lifecycleService.revokeCredential(
          credentialId,
          "Issuer B mencoba mencabut milik Issuer A",
          issuerBSigner
        )
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller");
    });

    it("Admin Governance DIIZINKAN mencabut kredensial jika terjadi pelanggaran protokol", async function () {
      const result = await lifecycleService.revokeCredential(
        credentialId,
        "Intervensi Admin Governance konsorsium",
        admin
      );

      expect(result.success).to.be.true;
      expect(result.newStatus).to.equal("REVOKED");
    });
  });

  describe("M5-05: Emisi Event On-Chain & Rekonstruksi Audit Trail (FR-10)", function () {
    it("Harus mencatat seluruh riwayat siklus hidup dalam Audit Trail blockchain", async function () {
      // 1. Suspend kredensial
      await lifecycleService.suspendCredential(
        credentialId,
        "Langkah 1: Investigasi administratif"
      );

      // 2. Reaktifkan kredensial
      await lifecycleService.reactivateCredential(credentialId);

      // 3. Cabut kredensial
      await lifecycleService.revokeCredential(
        credentialId,
        "Langkah 3: Putusan akhir pencabutan"
      );

      // Ambil seluruh rekam jejak audit
      const auditTrail = await lifecycleService.getAuditHistory(credentialId);

      expect(auditTrail).to.have.lengthOf(3);

      // Periksa Event 1
      expect(auditTrail[0].previousStatus).to.equal("ACTIVE");
      expect(auditTrail[0].newStatus).to.equal("SUSPENDED");
      expect(auditTrail[0].reasonRef).to.equal("Langkah 1: Investigasi administratif");
      expect(auditTrail[0].transactionHash).to.be.properHex(64);

      // Periksa Event 2
      expect(auditTrail[1].previousStatus).to.equal("SUSPENDED");
      expect(auditTrail[1].newStatus).to.equal("ACTIVE");
      expect(auditTrail[1].reasonRef).to.equal("Reactivated");

      // Periksa Event 3
      expect(auditTrail[2].previousStatus).to.equal("ACTIVE");
      expect(auditTrail[2].newStatus).to.equal("REVOKED");
      expect(auditTrail[2].reasonRef).to.equal("Langkah 3: Putusan akhir pencabutan");
    });
  });
});
