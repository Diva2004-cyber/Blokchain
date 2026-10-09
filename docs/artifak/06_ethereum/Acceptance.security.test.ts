import { expect } from "chai";
import { ethers } from "hardhat";
import { CredentialRegistry } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { IssuanceService } from "../../apps/api/src/services/issuance.service";
import { VerificationService } from "../../apps/api/src/services/verification.service";
import { LifecycleService } from "../../apps/api/src/services/lifecycle.service";
import {
  IssuerInfo,
  VerifiableCredential,
  VerifiablePresentation,
  VerifierRequest,
} from "../../apps/api/src/types/credential";
import * as fixtures from "../../data/synthetic/academic_credentials_fixtures.json";

describe("Milestone 7 (M7) - Mandatory Acceptance & Threat Tests (AT-01 s/d AT-10)", function () {
  let registry: CredentialRegistry;
  let admin: HardhatEthersSigner;
  let authorizedIssuer: HardhatEthersSigner;
  let unauthorizedSigner: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;

  let issuanceService: IssuanceService;
  let verificationService: VerificationService;
  let lifecycleService: LifecycleService;

  const validIssuer: IssuerInfo = {
    id: "did:web:uis.ac.id",
    name: "Universitas Indonesia Sintetis",
    ethereumAddress: "",
    verificationMethod: "did:web:uis.ac.id#key-1",
  };

  let validVc: VerifiableCredential;
  let validCredentialIdOnChain: string;

  beforeEach(async function () {
    [admin, authorizedIssuer, unauthorizedSigner, attacker] = await ethers.getSigners();
    validIssuer.ethereumAddress = authorizedIssuer.address;

    const RegistryFactory = await ethers.getContractFactory("CredentialRegistry");
    registry = (await RegistryFactory.deploy()) as unknown as CredentialRegistry;
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();

    // Register legitimate issuer on-chain
    await registry.connect(admin)["registerIssuer(string,address,string)"](
      validIssuer.id,
      authorizedIssuer.address,
      validIssuer.verificationMethod!
    );

    issuanceService = new IssuanceService({
      registryContract: registry as any,
      issuerSigner: authorizedIssuer,
      registryAddress,
    });

    verificationService = new VerificationService({
      registryContract: registry as any,
    });

    lifecycleService = new LifecycleService({
      registryContract: registry as any,
      defaultSigner: authorizedIssuer,
    });

    // Baseline issue valid credential
    const fixture1 = (fixtures as any)[0];
    const issueResult = await issuanceService.issueAndAnchorCredential(
      {
        issuerId: validIssuer.id,
        credentialSubject: fixture1.credential.credentialSubject,
        validFrom: fixture1.credential.validFrom,
        validUntil: fixture1.credential.validUntil,
        customId: fixture1.credential.id,
      },
      validIssuer
    );

    validVc = issueResult.credential;
    validCredentialIdOnChain = issueResult.credentialIdOnChain;
  });

  // AT-01: Authorized issuer issues credential
  it("AT-01: Penerbit resmi berhasil menerbitkan kredensial, transaksi sukses, status on-chain ACTIVE", async function () {
    const credRecord = await registry.getCredential(validCredentialIdOnChain);
    expect(credRecord.status).to.equal(1); // ACTIVE
    expect(credRecord.issuerId).to.equal(validIssuer.id);
    expect(await registry.isCredentialValid(validCredentialIdOnChain)).to.be.true;
  });

  // AT-02: Verifier checks valid credential
  it("AT-02: Verifier memvalidasi kredensial sah dan mengembalikan status VERIFIED / ACTIVE", async function () {
    const result = await verificationService.verifyCredential(validVc);
    expect(result.isValid).to.be.true;
    expect(result.status).to.equal("ACTIVE");
    expect(result.reasons).to.be.empty;
    expect(result.checks.signature).to.be.true;
    expect(result.checks.integrityCommitment).to.be.true;
  });

  // AT-03: Modify one academic attribute (Tamper Detection)
  it("AT-03: Memodifikasi satu atribut akademik ditolak dengan status TAMPERED", async function () {
    const tamperedVc: VerifiableCredential = JSON.parse(JSON.stringify(validVc));
    tamperedVc.credentialSubject.gpa = "4.00"; // Ubah IPK sepihak

    const result = await verificationService.verifyCredential(tamperedVc);
    expect(result.isValid).to.be.false;
    expect(result.status).to.equal("TAMPERED");
    expect(result.checks.integrityCommitment).to.be.false;
    expect(result.reasons.some((r) => r.includes("DATA_DIPALSUKAN"))).to.be.true;
  });

  // AT-04: Unauthorized account tries issue
  it("AT-04: Akun tanpa otorisasi mencoba menerbitkan kredensial dan transaksi di-revert on-chain", async function () {
    const unauthIdOnChain = ethers.keccak256(ethers.toUtf8Bytes("diploma-unauth-001"));
    const dummyCommitment = ethers.keccak256(ethers.toUtf8Bytes("commit-001"));

    await expect(
      registry.connect(attacker).issueCredential(
        unauthIdOnChain,
        validIssuer.id,
        dummyCommitment,
        1,
        0
      )
    ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller").withArgs(attacker.address);
  });

  // AT-05: Unauthorized account tries revoke
  it("AT-05: Akun tanpa otorisasi mencoba mencabut kredensial dan transaksi di-revert on-chain", async function () {
    await expect(
      registry.connect(attacker).revokeCredential(
        validCredentialIdOnChain,
        "Serangan pencabutan ilegal"
      )
    ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller").withArgs(attacker.address);
  });

  // AT-06: Revoked credential verified
  it("AT-06: Kredensial yang dicabut ditolak oleh verifier dengan status REVOKED", async function () {
    await lifecycleService.revokeCredential(validVc.id, "Dicabut karena pelanggaran etik");

    const result = await verificationService.verifyCredential(validVc);
    expect(result.isValid).to.be.false;
    expect(result.status).to.equal("REVOKED");
    expect(result.reasons.some((r) => r.includes("KREDENSIAL_DICABUT"))).to.be.true;
  });

  // AT-07: Expired credential verified
  it("AT-07: Kredensial yang kedaluwarsa ditolak oleh verifier dengan status EXPIRED", async function () {
    // Waktu verifikasi di masa depan yang melampaui batas berlaku
    const futureTime = new Date("2040-01-01T00:00:00Z");

    const result = await verificationService.verifyCredential(validVc, futureTime);
    expect(result.isValid).to.be.false;
    expect(result.status).to.equal("EXPIRED");
    expect(result.checks.validityPeriod).to.be.false;
    expect(result.reasons.some((r) => r.includes("KREDENSIAL_KEDALUWARSA"))).to.be.true;
  });

  // AT-08: Replay same presentation
  it("AT-08: Replay attack ditolak saat presentasi dengan nonce sama digunakan ulang", async function () {
    const verifierRequest: VerifierRequest = {
      requestId: "REQ-ACCEPTANCE-001",
      purpose: "Uji Replay Protection Acceptance",
      verifier: {
        id: "did:web:techcorp-synthetic.id",
        name: "PT Teknologi Maju Sintetis",
        ethereumAddress: admin.address,
      },
      audience: "https://techcorp-synthetic.id/verify-callback",
      nonce: "nonce-fixed-one-time-replay-001",
      requestedAttributes: ["fullName", "degreeName"],
      expiresAt: "2026-12-31T23:59:59Z",
      oneTimeNonce: true,
    };

    const vp: VerifiablePresentation = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiablePresentation"],
      verifiableCredential: [validVc],
      presentationSubmission: {
        requestId: verifierRequest.requestId,
        audience: verifierRequest.audience,
        nonce: verifierRequest.nonce,
      },
    };

    // Penggunaan pertama: Berhasil
    const firstResult = await verificationService.verifyPresentation(vp, verifierRequest);
    expect(firstResult.isValid).to.be.true;

    // Penggunaan kedua (Replay): Gagal
    const replayResult = await verificationService.verifyPresentation(vp, verifierRequest);
    expect(replayResult.isValid).to.be.false;
    expect(replayResult.checks.nonceValid).to.be.false;
    expect(replayResult.reasons.some((r) => r.includes("REPLAY_ATTACK_DETECTED"))).to.be.true;
  });

  // AT-09: Wrong issuer
  it("AT-09: Kredensial dengan issuer tidak terdaftar ditolak oleh verifier", async function () {
    const fakeIssuerInfo: IssuerInfo = {
      id: "did:web:kampus-ilegal.ac.id",
      name: "Kampus Ilegal Tanpa Izin",
      ethereumAddress: unauthorizedSigner.address,
      verificationMethod: "did:web:kampus-ilegal.ac.id#key-1",
    };

    const unauthService = new IssuanceService({
      registryContract: registry as any,
      issuerSigner: unauthorizedSigner,
      registryAddress: await registry.getAddress(),
    });

    const fakeVc = await unauthService.createSignedCredential(
      {
        issuerId: fakeIssuerInfo.id,
        credentialSubject: (fixtures as any)[0].credential.credentialSubject,
        validFrom: "2026-08-20T00:00:00Z",
        validUntil: "2036-08-20T23:59:59Z",
      },
      fakeIssuerInfo
    );

    const result = await verificationService.verifyCredential(fakeVc);
    expect(result.isValid).to.be.false;
    expect(result.checks.issuerRegistered).to.be.false;
    expect(result.reasons.some((r) => r.includes("ISSUER_TIDAK_TERDAFTAR"))).to.be.true;
  });

  // AT-10: Node/RPC unavailable (Failure mode resilience)
  it("AT-10: Penanganan kegagalan RPC/Node mengembalikan pesan kesalahan terkontrol (tidak ada false VERIFIED)", async function () {
    // Buat provider/kontrak dummy yang putus / non-existent
    const deadContract = new ethers.Contract(
      "0x0000000000000000000000000000000000000001",
      [
        "function getCredential(bytes32) external view returns (tuple(bytes32,string,bytes32,uint8,uint32,uint256,uint256,uint256))",
        "function getIssuer(string) external view returns (tuple(string,address,string,bool,uint256))",
      ],
      ethers.provider
    );

    const disconnectedVerificationService = new VerificationService({
      registryContract: deadContract,
    });

    const result = await disconnectedVerificationService.verifyCredential(validVc);
    // Verifikasi harus mengembalikan false atau reject, BUKAN false-positive isValid: true
    expect(result.isValid).to.be.false;
    expect(result.reasons.length).to.be.greaterThan(0);
  });
});
