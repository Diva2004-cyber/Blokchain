import { expect } from "chai";
import { ethers } from "hardhat";
import { CredentialRegistry } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { IssuanceService } from "../../apps/api/src/services/issuance.service";
import { IssuerInfo } from "../../apps/api/src/types/credential";
import { computeCredentialCommitment, canonicalizeJson } from "../../apps/api/src/crypto/canonical";
import { recoverSignerAddress } from "../../apps/api/src/crypto/signer";
import * as fixtures from "../../data/synthetic/academic_credentials_fixtures.json";

describe("Milestone 3 (M3) - End-to-End Issuance & Anchoring Integration Tests", function () {
  let registry: CredentialRegistry;
  let admin: HardhatEthersSigner;
  let issuerSigner: HardhatEthersSigner;
  let unauthorizedSigner: HardhatEthersSigner;
  let issuanceService: IssuanceService;

  const issuerInfo: IssuerInfo = {
    id: "did:web:uis.ac.id",
    name: "Universitas Indonesia Sintetis",
    ethereumAddress: "",
    verificationMethod: "did:web:uis.ac.id#key-1",
  };

  beforeEach(async function () {
    [admin, issuerSigner, unauthorizedSigner] = await ethers.getSigners();
    issuerInfo.ethereumAddress = issuerSigner.address;

    // 1. Deploy Registry Contract
    const RegistryFactory = await ethers.getContractFactory("CredentialRegistry");
    registry = (await RegistryFactory.deploy()) as unknown as CredentialRegistry;
    await registry.waitForDeployment();

    const registryAddress = await registry.getAddress();

    // 2. Register Issuer on-chain
    await registry.connect(admin)["registerIssuer(string,address,string)"](
      issuerInfo.id,
      issuerSigner.address,
      issuerInfo.verificationMethod!
    );

    // 3. Initialize Issuance Service with live contract and signer
    issuanceService = new IssuanceService({
      registryContract: registry as any,
      issuerSigner: issuerSigner,
      registryAddress: registryAddress,
    });
  });

  it("M3-01: Berhasil menerbitkan VC sintetik SCN-VALID-01 dan meng-anchor komitmen ke Smart Contract", async function () {
    const fixture1 = (fixtures as any)[0]; // SCN-VALID-01
    const subject = fixture1.credential.credentialSubject;

    const issueRequest = {
      issuerId: issuerInfo.id,
      credentialSubject: subject,
      validFrom: fixture1.credential.validFrom,
      validUntil: fixture1.credential.validUntil,
      customId: fixture1.credential.id,
    };

    // Eksekusi penerbitan dan anchoring
    const result = await issuanceService.issueAndAnchorCredential(
      issueRequest,
      issuerInfo
    );

    // Verifikasi respons penerbitan
    expect(result.success).to.be.true;
    expect(result.transactionHash).to.be.properHex(64);
    expect(result.credentialIdOnChain).to.be.properHex(64);
    expect(result.commitment).to.be.properHex(64);

    const vc = result.credential;
    expect(vc.id).to.equal(fixture1.credential.id);
    expect(vc.issuer.id).to.equal(issuerInfo.id);
    expect(vc.credentialSubject.fullName).to.equal(subject.fullName);
    expect(vc.credentialSubject.gpa).to.equal(subject.gpa);

    // Verifikasi State di Blockchain
    const onChainRecord = await registry.getCredential(result.credentialIdOnChain);
    expect(onChainRecord.credentialId).to.equal(result.credentialIdOnChain);
    expect(onChainRecord.issuerId).to.equal(issuerInfo.id);
    expect(onChainRecord.commitment).to.equal(result.commitment);
    expect(onChainRecord.status).to.equal(1); // Status.ACTIVE
    expect(await registry.isCredentialValid(result.credentialIdOnChain)).to.be.true;

    // Verifikasi Tanda Tangan Kriptografis (Off-Chain Proof)
    const unsignedPayload = {
      "@context": vc["@context"],
      id: vc.id,
      type: vc.type,
      issuer: vc.issuer,
      validFrom: vc.validFrom,
      validUntil: vc.validUntil,
      credentialSubject: vc.credentialSubject,
      commitment: result.commitment,
    };
    const canonicalString = canonicalizeJson(unsignedPayload);
    const recoveredSigner = recoverSignerAddress(canonicalString, vc.proof.proofValue);
    expect(recoveredSigner.toLowerCase()).to.equal(issuerSigner.address.toLowerCase());
  });

  it("M3-02: Berhasil menerbitkan VC sintetik SCN-VALID-02 (ITBS) tanpa expiry (permanen)", async function () {
    const fixture2 = (fixtures as any)[1]; // SCN-VALID-02
    const itbsIssuer: IssuerInfo = {
      id: "did:web:itbs.ac.id",
      name: "Institut Teknologi Bandung Sintetis",
      ethereumAddress: issuerSigner.address,
      verificationMethod: "did:web:itbs.ac.id#key-1",
    };

    // Daftarkan ITBS
    await registry.connect(admin)["registerIssuer(string,address,string)"](
      itbsIssuer.id,
      itbsIssuer.ethereumAddress,
      itbsIssuer.verificationMethod!
    );

    const result = await issuanceService.issueAndAnchorCredential(
      {
        issuerId: itbsIssuer.id,
        credentialSubject: fixture2.credential.credentialSubject,
        customId: fixture2.credential.id,
      },
      itbsIssuer
    );

    expect(result.success).to.be.true;
    expect(result.transactionHash).to.be.properHex(64);

    const onChainRecord = await registry.getCredential(result.credentialIdOnChain);
    expect(onChainRecord.validUntil).to.equal(0);
    expect(onChainRecord.status).to.equal(1); // ACTIVE
  });

  it("M3-03: Deteksi Pemalsuan Integritas (Tamper Detection via Commitment Hash Mismatch)", async function () {
    const fixture1 = (fixtures as any)[0];
    const subject = { ...fixture1.credential.credentialSubject };

    const result = await issuanceService.issueAndAnchorCredential(
      {
        issuerId: issuerInfo.id,
        credentialSubject: subject,
        customId: fixture1.credential.id,
      },
      issuerInfo
    );

    // Ambil komitmen asli dari on-chain
    const originalOnChainRecord = await registry.getCredential(result.credentialIdOnChain);

    // Penyerang mencoba memalsukan IPK (misal dari 3.85 menjadi 4.00)
    const tamperedSubject = { ...subject, gpa: "4.00" };
    const tamperedCommitment = computeCredentialCommitment(tamperedSubject, fixture1.credential.id);

    // Verifikasi bahwa komitmen data palsu TIDAK COCOK dengan komitmen on-chain
    expect(tamperedCommitment).to.not.equal(originalOnChainRecord.commitment);
  });

  it("M3-04: Menolak Anchoring Kredensial jika dilakukan oleh Signer yang tidak berhak", async function () {
    const fixture1 = (fixtures as any)[0];

    // Coba anchor menggunakan unauthorizedSigner
    const unauthorizedService = new IssuanceService({
      registryContract: registry as any,
      issuerSigner: unauthorizedSigner,
      registryAddress: await registry.getAddress(),
    });

    await expect(
      unauthorizedService.issueAndAnchorCredential(
        {
          issuerId: issuerInfo.id,
          credentialSubject: fixture1.credential.credentialSubject,
        },
        issuerInfo
      )
    ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller").withArgs(unauthorizedSigner.address);
  });
});
