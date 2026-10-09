import { expect } from "chai";
import { ethers } from "hardhat";
import { CredentialRegistry } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { IssuanceService } from "../../apps/api/src/services/issuance.service";
import { VerificationService } from "../../apps/api/src/services/verification.service";
import {
  IssuerInfo,
  VerifiableCredential,
  VerifiablePresentation,
  VerifierRequest,
} from "../../apps/api/src/types/credential";
import * as credFixtures from "../../data/synthetic/academic_credentials_fixtures.json";
import * as verifierFixtures from "../../data/synthetic/verifier_requests_fixtures.json";

describe("Milestone 4 (M4) - Verification Service Integration Tests", function () {
  let registry: CredentialRegistry;
  let admin: HardhatEthersSigner;
  let issuerSigner: HardhatEthersSigner;
  let unauthorizedSigner: HardhatEthersSigner;
  let issuanceService: IssuanceService;
  let verificationService: VerificationService;

  const validIssuerInfo: IssuerInfo = {
    id: "did:web:uis.ac.id",
    name: "Universitas Indonesia Sintetis",
    ethereumAddress: "",
    verificationMethod: "did:web:uis.ac.id#key-1",
  };

  let validVc: VerifiableCredential;
  let validCredentialIdOnChain: string;

  beforeEach(async function () {
    [admin, issuerSigner, unauthorizedSigner] = await ethers.getSigners();
    validIssuerInfo.ethereumAddress = issuerSigner.address;

    // 1. Deploy Contract
    const RegistryFactory = await ethers.getContractFactory("CredentialRegistry");
    registry = (await RegistryFactory.deploy()) as unknown as CredentialRegistry;
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();

    // 2. Register Authorized Issuer
    await registry.connect(admin)["registerIssuer(string,address,string)"](
      validIssuerInfo.id,
      issuerSigner.address,
      validIssuerInfo.verificationMethod!
    );

    // 3. Initialize Issuance & Verification Services
    issuanceService = new IssuanceService({
      registryContract: registry as any,
      issuerSigner: issuerSigner,
      registryAddress: registryAddress,
    });

    verificationService = new VerificationService({
      registryContract: registry as any,
    });

    // 4. Issue SCN-VALID-01 as baseline active credential
    const fixture1 = (credFixtures as any)[0];
    const issueResult = await issuanceService.issueAndAnchorCredential(
      {
        issuerId: validIssuerInfo.id,
        credentialSubject: fixture1.credential.credentialSubject,
        validFrom: fixture1.credential.validFrom,
        validUntil: fixture1.credential.validUntil,
        customId: fixture1.credential.id,
      },
      validIssuerInfo
    );

    validVc = issueResult.credential;
    validCredentialIdOnChain = issueResult.credentialIdOnChain;
  });

  describe("Skenario 1: Kredensial Sah dan Aktif (SCN-VALID-01)", function () {
    it("Harus mengembalikan isValid: true dan status: ACTIVE untuk VC yang valid", async function () {
      const result = await verificationService.verifyCredential(validVc);

      expect(result.isValid).to.be.true;
      expect(result.status).to.equal("ACTIVE");
      expect(result.checks.structure).to.be.true;
      expect(result.checks.signature).to.be.true;
      expect(result.checks.issuerRegistered).to.be.true;
      expect(result.checks.issuerActive).to.be.true;
      expect(result.checks.onChainStatus).to.be.true;
      expect(result.checks.integrityCommitment).to.be.true;
      expect(result.checks.validityPeriod).to.be.true;
      expect(result.reasons).to.be.empty;
      expect(result.onChainDetails).to.not.be.undefined;
      expect(result.onChainDetails?.status).to.equal(1); // ACTIVE
    });
  });

  describe("Skenario 2: Integritas Data Dipalsukan (Tamper Detection - SCN-TAMPERED-06)", function () {
    it("Harus menolak kredensial jika GPA atau data subject diubah", async function () {
      const tamperedVc: VerifiableCredential = JSON.parse(JSON.stringify(validVc));
      tamperedVc.credentialSubject.gpa = "4.00"; // Nilai diubah secara sepihak

      const result = await verificationService.verifyCredential(tamperedVc);

      expect(result.isValid).to.be.false;
      expect(result.status).to.equal("TAMPERED");
      expect(result.checks.integrityCommitment).to.be.false;
      expect(result.reasons.some((r) => r.includes("DATA_DIPALSUKAN"))).to.be.true;
    });

    it("Harus menolak kredensial jika nama mahasiswa diubah", async function () {
      const tamperedVc: VerifiableCredential = JSON.parse(JSON.stringify(validVc));
      tamperedVc.credentialSubject.fullName = "Penyusup Tidak Dikenal";

      const result = await verificationService.verifyCredential(tamperedVc);

      expect(result.isValid).to.be.false;
      expect(result.status).to.equal("TAMPERED");
      expect(result.checks.integrityCommitment).to.be.false;
    });
  });

  describe("Skenario 3: Kredensial Ditangguhkan (Suspended - SCN-SUSPENDED-03)", function () {
    it("Harus menolak kredensial yang berstatus SUSPENDED on-chain", async function () {
      // Issuer menangguhkan kredensial
      await registry
        .connect(issuerSigner)
        .suspendCredential(validCredentialIdOnChain, "Pemeriksaan administratif akademik");

      const result = await verificationService.verifyCredential(validVc);

      expect(result.isValid).to.be.false;
      expect(result.status).to.equal("SUSPENDED");
      expect(result.checks.onChainStatus).to.be.false;
      expect(result.reasons.some((r) => r.includes("KREDENSIAL_DITANGGUHKAN"))).to.be.true;
      expect(result.onChainDetails?.status).to.equal(2); // SUSPENDED
    });
  });

  describe("Skenario 4: Kredensial Dicabut (Revoked - SCN-REVOKED-04)", function () {
    it("Harus menolak kredensial yang berstatus REVOKED on-chain secara permanen", async function () {
      // Issuer mencabut kredensial
      await registry
        .connect(issuerSigner)
        .revokeCredential(validCredentialIdOnChain, "Pemalsuan berkas pendaftaran");

      const result = await verificationService.verifyCredential(validVc);

      expect(result.isValid).to.be.false;
      expect(result.status).to.equal("REVOKED");
      expect(result.checks.onChainStatus).to.be.false;
      expect(result.reasons.some((r) => r.includes("KREDENSIAL_DICABUT"))).to.be.true;
      expect(result.onChainDetails?.status).to.equal(3); // REVOKED
    });
  });

  describe("Skenario 5: Kredensial Kedaluwarsa (Expired - SCN-EXPIRED-05)", function () {
    it("Harus menolak kredensial yang melewati masa berlaku validUntil", async function () {
      // Simulasikan waktu verifikasi di masa depan (tahun 2040)
      const futureVerificationDate = new Date("2040-01-01T00:00:00Z");

      const result = await verificationService.verifyCredential(
        validVc,
        futureVerificationDate
      );

      expect(result.isValid).to.be.false;
      expect(result.status).to.equal("EXPIRED");
      expect(result.checks.validityPeriod).to.be.false;
      expect(result.reasons.some((r) => r.includes("KREDENSIAL_KEDALUWARSA"))).to.be.true;
    });
  });

  describe("Skenario 6: Penerbit Tidak Terdaftar / Unauthorized (SCN-UNAUTH-07)", function () {
    it("Harus menolak kredensial yang diterbitkan oleh issuer yang belum terdaftar di blockchain", async function () {
      const fakeIssuerInfo: IssuerInfo = {
        id: "did:web:kampus-palsu.ac.id",
        name: "Universitas Palsu Tanpa Izin",
        ethereumAddress: unauthorizedSigner.address,
        verificationMethod: "did:web:kampus-palsu.ac.id#key-1",
      };

      const unauthIssuanceService = new IssuanceService({
        registryContract: registry as any,
        issuerSigner: unauthorizedSigner,
        registryAddress: await registry.getAddress(),
      });

      // Terbitkan kredensial tanpa pendaftaran issuer on-chain
      const unauthVc = await unauthIssuanceService.createSignedCredential(
        {
          issuerId: fakeIssuerInfo.id,
          credentialSubject: (credFixtures as any)[0].credential.credentialSubject,
          validFrom: "2026-08-20T00:00:00Z",
          validUntil: "2036-08-20T23:59:59Z",
        },
        fakeIssuerInfo
      );

      const result = await verificationService.verifyCredential(unauthVc);

      expect(result.isValid).to.be.false;
      expect(result.checks.issuerRegistered).to.be.false;
      expect(result.reasons.some((r) => r.includes("ISSUER_TIDAK_TERDAFTAR"))).to.be.true;
    });
  });

  describe("Skenario 7: Tanda Tangan Kriptografis Tidak Sah / Rusak", function () {
    it("Harus menolak kredensial jika proof signature diutak-atik", async function () {
      const corruptedSigVc: VerifiableCredential = JSON.parse(JSON.stringify(validVc));
      // Ganti sebagian byte signature
      corruptedSigVc.proof.proofValue =
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901c";

      const result = await verificationService.verifyCredential(corruptedSigVc);

      expect(result.isValid).to.be.false;
      expect(result.status).to.equal("INVALID_SIGNATURE");
      expect(result.checks.signature).to.be.false;
      expect(result.reasons.some((r) => r.includes("TANDA_TANGAN_TIDAK_SAH"))).to.be.true;
    });
  });

  describe("Skenario 8, 9, 10: Verifiable Presentation & Replay Attack Prevention (AT-08)", function () {
    let verifierRequest: VerifierRequest;

    beforeEach(function () {
      verifierRequest = {
        requestId: "REQ-TEST-2026-001",
        purpose: "Verifikasi Calon Pegawai Software Engineer",
        verifier: {
          id: "did:web:techcorp-synthetic.id",
          name: "PT Teknologi Maju Sintetis",
          ethereumAddress: admin.address,
        },
        audience: "https://techcorp-synthetic.id/verify-callback",
        nonce: "nonce-unique-random-token-2026-abc",
        requestedAttributes: ["fullName", "degreeName", "studyProgram", "gpa"],
        expiresAt: "2026-12-31T23:59:59Z",
        oneTimeNonce: true,
      };
    });

    it("Skenario 8: Harus menyetujui Verifiable Presentation yang sah dan sesuai request", async function () {
      const presentation: VerifiablePresentation = {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        type: ["VerifiablePresentation"],
        verifiableCredential: [validVc],
        presentationSubmission: {
          requestId: verifierRequest.requestId,
          audience: verifierRequest.audience,
          nonce: verifierRequest.nonce,
        },
      };

      const vpResult = await verificationService.verifyPresentation(
        presentation,
        verifierRequest,
        new Date("2026-10-06T10:00:00Z")
      );

      expect(vpResult.isValid).to.be.true;
      expect(vpResult.checks.nonceValid).to.be.true;
      expect(vpResult.checks.audienceValid).to.be.true;
      expect(vpResult.checks.requestNotExpired).to.be.true;
      expect(vpResult.checks.credentialsValid).to.be.true;
      expect(vpResult.checks.requiredAttributesSupplied).to.be.true;
      expect(vpResult.reasons).to.be.empty;
    });

    it("Skenario 9 (AT-08): Harus menggagalkan Replay Attack jika nonce yang sama dipakai ulang", async function () {
      const presentation: VerifiablePresentation = {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        type: ["VerifiablePresentation"],
        verifiableCredential: [validVc],
        presentationSubmission: {
          requestId: verifierRequest.requestId,
          audience: verifierRequest.audience,
          nonce: verifierRequest.nonce,
        },
      };

      const testTime = new Date("2026-10-06T10:00:00Z");

      // Presentasi pertama: Lulus
      const firstResult = await verificationService.verifyPresentation(
        presentation,
        verifierRequest,
        testTime
      );
      expect(firstResult.isValid).to.be.true;

      // Replay Attack: Kirim presentasi kedua dengan nonce yang sama
      const replayResult = await verificationService.verifyPresentation(
        presentation,
        verifierRequest,
        testTime
      );

      expect(replayResult.isValid).to.be.false;
      expect(replayResult.checks.nonceValid).to.be.false;
      expect(
        replayResult.reasons.some((r) => r.includes("REPLAY_ATTACK_DETECTED"))
      ).to.be.true;
    });

    it("Skenario 10: Harus menolak Verifiable Presentation jika atribut wajib yang diminta tidak ada", async function () {
      const strictRequest: VerifierRequest = {
        ...verifierRequest,
        nonce: "nonce-strict-test-1234",
        requestedAttributes: ["fullName", "degreeName", "nonExistentField123"],
      };

      const presentation: VerifiablePresentation = {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        type: ["VerifiablePresentation"],
        verifiableCredential: [validVc],
        presentationSubmission: {
          requestId: strictRequest.requestId,
          audience: strictRequest.audience,
          nonce: strictRequest.nonce,
        },
      };

      const result = await verificationService.verifyPresentation(
        presentation,
        strictRequest,
        new Date("2026-10-06T10:00:00Z")
      );

      expect(result.isValid).to.be.false;
      expect(result.checks.requiredAttributesSupplied).to.be.false;
      expect(
        result.reasons.some((r) => r.includes("ATRIBUT_TIDAK_LENGKAP"))
      ).to.be.true;
    });
  });
});
