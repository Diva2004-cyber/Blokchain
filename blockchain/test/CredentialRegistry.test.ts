import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { CredentialRegistry } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("CredentialRegistry - Unit Tests", function () {
  let registry: CredentialRegistry;
  let admin: HardhatEthersSigner;
  let issuerSigner: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;

  const ISSUER_ID = "did:web:universitas-indonesia.ac.id";
  const KEY_METHOD = "did:web:universitas-indonesia.ac.id#key-1";

  // Sample credential fixtures
  const CREDENTIAL_ID_1 = ethers.keccak256(ethers.toUtf8Bytes("diploma:2026:CS:001"));
  const COMMITMENT_1 = ethers.keccak256(ethers.toUtf8Bytes("credential-payload-hash-001"));
  const SCHEMA_VERSION_1 = 1;

  beforeEach(async function () {
    [admin, issuerSigner, attacker, recipient] = await ethers.getSigners();

    const RegistryFactory = await ethers.getContractFactory("CredentialRegistry");
    registry = (await RegistryFactory.deploy()) as unknown as CredentialRegistry;
    await registry.waitForDeployment();
  });

  describe("1. Deployment & Governance Admin", function () {
    it("harus menetapkan deployer sebagai admin", async function () {
      expect(await registry.admin()).to.equal(admin.address);
    });

    it("harus mengizinkan transfer kepemilikan admin ke alamat baru", async function () {
      await registry.connect(admin).transferAdmin(issuerSigner.address);
      expect(await registry.admin()).to.equal(issuerSigner.address);
    });

    it("harus menolak transfer admin ke alamat address(0)", async function () {
      await expect(
        registry.connect(admin).transferAdmin(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });

    it("harus menolak jika non-admin mencoba transferAdmin", async function () {
      await expect(
        registry.connect(attacker).transferAdmin(attacker.address)
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller").withArgs(attacker.address);
    });
  });

  describe("2. Registrasi & Manajemen Issuer", function () {
    it("harus berhasil mendaftarkan issuer baru oleh admin", async function () {
      const tx = await registry.connect(admin)["registerIssuer(string,address,string)"](
        ISSUER_ID,
        issuerSigner.address,
        KEY_METHOD
      );

      await expect(tx)
        .to.emit(registry, "IssuerRegistered")
        .withArgs(ISSUER_ID, issuerSigner.address, KEY_METHOD, (await time.latest()));

      const issuerData = await registry.getIssuer(ISSUER_ID);
      expect(issuerData.issuerId).to.equal(ISSUER_ID);
      expect(issuerData.issuerAddress).to.equal(issuerSigner.address);
      expect(issuerData.verificationMethod).to.equal(KEY_METHOD);
      expect(issuerData.active).to.be.true;
    });

    it("harus dapat mengambil data issuer berdasarkan address", async function () {
      await registry.connect(admin)["registerIssuer(string,address,string)"](
        ISSUER_ID,
        issuerSigner.address,
        KEY_METHOD
      );

      const issuerData = await registry.getIssuerByAddress(issuerSigner.address);
      expect(issuerData.issuerId).to.equal(ISSUER_ID);
      expect(issuerData.active).to.be.true;
    });

    it("harus menolak registrasi issuer duplikat", async function () {
      await registry.connect(admin)["registerIssuer(string,address,string)"](
        ISSUER_ID,
        issuerSigner.address,
        KEY_METHOD
      );

      await expect(
        registry.connect(admin)["registerIssuer(string,address,string)"](
          ISSUER_ID,
          issuerSigner.address,
          KEY_METHOD
        )
      ).to.be.revertedWithCustomError(registry, "IssuerAlreadyRegistered").withArgs(ISSUER_ID);
    });

    it("harus menolak registrasi dengan issuerAddress zero address", async function () {
      await expect(
        registry.connect(admin)["registerIssuer(string,address,string)"](
          ISSUER_ID,
          ethers.ZeroAddress,
          KEY_METHOD
        )
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });

    it("harus menolak registrasi dengan issuerId kosong", async function () {
      await expect(
        registry.connect(admin)["registerIssuer(string,address,string)"](
          "",
          issuerSigner.address,
          KEY_METHOD
        )
      ).to.be.revertedWithCustomError(registry, "InvalidIdentifier");
    });

    it("harus dapat mengubah status aktif/non-aktif issuer", async function () {
      await registry.connect(admin)["registerIssuer(string,address,string)"](
        ISSUER_ID,
        issuerSigner.address,
        KEY_METHOD
      );

      // Nonaktifkan
      await expect(registry.connect(admin).setIssuerStatus(ISSUER_ID, false))
        .to.emit(registry, "IssuerStatusUpdated");

      let issuerData = await registry.getIssuer(ISSUER_ID);
      expect(issuerData.active).to.be.false;

      // Aktifkan kembali
      await registry.connect(admin).setIssuerStatus(ISSUER_ID, true);
      issuerData = await registry.getIssuer(ISSUER_ID);
      expect(issuerData.active).to.be.true;
    });
  });

  describe("3. Penerbitan Kredensial (issueCredential)", function () {
    beforeEach(async function () {
      await registry.connect(admin)["registerIssuer(string,address,string)"](
        ISSUER_ID,
        issuerSigner.address,
        KEY_METHOD
      );
    });

    it("harus berhasil menerbitkan kredensial permanen (validUntil = 0)", async function () {
      const tx = await registry.connect(issuerSigner).issueCredential(
        CREDENTIAL_ID_1,
        ISSUER_ID,
        COMMITMENT_1,
        SCHEMA_VERSION_1,
        0
      );

      const latestTime = await time.latest();
      await expect(tx)
        .to.emit(registry, "CredentialIssued")
        .withArgs(CREDENTIAL_ID_1, ISSUER_ID, COMMITMENT_1, SCHEMA_VERSION_1, 0, latestTime);

      const cred = await registry.getCredential(CREDENTIAL_ID_1);
      expect(cred.credentialId).to.equal(CREDENTIAL_ID_1);
      expect(cred.issuerId).to.equal(ISSUER_ID);
      expect(cred.commitment).to.equal(COMMITMENT_1);
      expect(cred.schemaVersion).to.equal(SCHEMA_VERSION_1);
      expect(cred.validUntil).to.equal(0);
      expect(cred.status).to.equal(1); // Status.ACTIVE
      expect(await registry.isCredentialValid(CREDENTIAL_ID_1)).to.be.true;
    });

    it("harus berhasil menerbitkan kredensial dengan batas masa berlaku masa depan", async function () {
      const futureValidUntil = (await time.latest()) + 3600 * 24 * 365; // 1 tahun ke depan

      await registry.connect(issuerSigner).issueCredential(
        CREDENTIAL_ID_1,
        ISSUER_ID,
        COMMITMENT_1,
        SCHEMA_VERSION_1,
        futureValidUntil
      );

      const cred = await registry.getCredential(CREDENTIAL_ID_1);
      expect(cred.validUntil).to.equal(futureValidUntil);
      expect(await registry.isCredentialValid(CREDENTIAL_ID_1)).to.be.true;
    });

    it("harus menolak jika validUntil sudah kedaluwarsa saat diterbitkan", async function () {
      const pastValidUntil = (await time.latest()) - 100;

      await expect(
        registry.connect(issuerSigner).issueCredential(
          CREDENTIAL_ID_1,
          ISSUER_ID,
          COMMITMENT_1,
          SCHEMA_VERSION_1,
          pastValidUntil
        )
      ).to.be.revertedWithCustomError(registry, "InvalidValidityPeriod").withArgs(pastValidUntil);
    });

    it("harus menolak penerbitan dengan commitment bytes32(0)", async function () {
      await expect(
        registry.connect(issuerSigner).issueCredential(
          CREDENTIAL_ID_1,
          ISSUER_ID,
          ethers.ZeroHash,
          SCHEMA_VERSION_1,
          0
        )
      ).to.be.revertedWithCustomError(registry, "InvalidCommitment");
    });

    it("harus menolak penerbitan kredensial duplikat", async function () {
      await registry.connect(issuerSigner).issueCredential(
        CREDENTIAL_ID_1,
        ISSUER_ID,
        COMMITMENT_1,
        SCHEMA_VERSION_1,
        0
      );

      await expect(
        registry.connect(issuerSigner).issueCredential(
          CREDENTIAL_ID_1,
          ISSUER_ID,
          COMMITMENT_1,
          SCHEMA_VERSION_1,
          0
        )
      ).to.be.revertedWithCustomError(registry, "CredentialAlreadyExists").withArgs(CREDENTIAL_ID_1);
    });
  });

  describe("4. Siklus Hidup Kredensial (Suspend, Reactivate, Revoke)", function () {
    beforeEach(async function () {
      await registry.connect(admin)["registerIssuer(string,address,string)"](
        ISSUER_ID,
        issuerSigner.address,
        KEY_METHOD
      );
      await registry.connect(issuerSigner).issueCredential(
        CREDENTIAL_ID_1,
        ISSUER_ID,
        COMMITMENT_1,
        SCHEMA_VERSION_1,
        0
      );
    });

    it("harus dapat menangguhkan kredensial (ACTIVE -> SUSPENDED)", async function () {
      const reason = "Audit investigasi nilai";
      const tx = await registry.connect(issuerSigner).suspendCredential(CREDENTIAL_ID_1, reason);

      await expect(tx)
        .to.emit(registry, "CredentialStatusChanged")
        .withArgs(CREDENTIAL_ID_1, 1, 2, reason, await time.latest()); // ACTIVE (1) -> SUSPENDED (2)

      const cred = await registry.getCredential(CREDENTIAL_ID_1);
      expect(cred.status).to.equal(2);
      expect(await registry.isCredentialValid(CREDENTIAL_ID_1)).to.be.false;
    });

    it("harus dapat mengaktifkan kembali kredensial (SUSPENDED -> ACTIVE)", async function () {
      await registry.connect(issuerSigner).suspendCredential(CREDENTIAL_ID_1, "Hold");

      const tx = await registry.connect(issuerSigner).reactivateCredential(CREDENTIAL_ID_1);

      await expect(tx)
        .to.emit(registry, "CredentialStatusChanged")
        .withArgs(CREDENTIAL_ID_1, 2, 1, "Reactivated", await time.latest()); // SUSPENDED (2) -> ACTIVE (1)

      const cred = await registry.getCredential(CREDENTIAL_ID_1);
      expect(cred.status).to.equal(1);
      expect(await registry.isCredentialValid(CREDENTIAL_ID_1)).to.be.true;
    });

    it("harus menolak reaktivasi kredensial yang sudah berstatus ACTIVE", async function () {
      await expect(
        registry.connect(issuerSigner).reactivateCredential(CREDENTIAL_ID_1)
      ).to.be.revertedWithCustomError(registry, "InvalidStateTransition");
    });

    it("harus dapat mencabut kredensial secara permanen (ACTIVE -> REVOKED)", async function () {
      const reason = "Pemalsuan berkas ijazah";
      const tx = await registry.connect(issuerSigner).revokeCredential(CREDENTIAL_ID_1, reason);

      await expect(tx)
        .to.emit(registry, "CredentialStatusChanged")
        .withArgs(CREDENTIAL_ID_1, 1, 3, reason, await time.latest()); // ACTIVE (1) -> REVOKED (3)

      const cred = await registry.getCredential(CREDENTIAL_ID_1);
      expect(cred.status).to.equal(3);
      expect(await registry.isCredentialValid(CREDENTIAL_ID_1)).to.be.false;
    });

    it("harus memastikan status REVOKED adalah terminal (tidak bisa di-suspend atau di-reactivate)", async function () {
      await registry.connect(issuerSigner).revokeCredential(CREDENTIAL_ID_1, "Dicabut");

      // Coba suspend setelah revoke
      await expect(
        registry.connect(issuerSigner).suspendCredential(CREDENTIAL_ID_1, "Coba suspend")
      ).to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked").withArgs(CREDENTIAL_ID_1);

      // Coba reactivate setelah revoke
      await expect(
        registry.connect(issuerSigner).reactivateCredential(CREDENTIAL_ID_1)
      ).to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked").withArgs(CREDENTIAL_ID_1);

      // Coba revoke kembali
      await expect(
        registry.connect(issuerSigner).revokeCredential(CREDENTIAL_ID_1, "Coba revoke lagi")
      ).to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked").withArgs(CREDENTIAL_ID_1);
    });

    it("harus mengembalikan isCredentialValid false jika masa berlaku telah lewat", async function () {
      const CRED_EXPIRING = ethers.keccak256(ethers.toUtf8Bytes("cert:expiring:002"));
      const validUntil = (await time.latest()) + 1000;

      await registry.connect(issuerSigner).issueCredential(
        CRED_EXPIRING,
        ISSUER_ID,
        COMMITMENT_1,
        SCHEMA_VERSION_1,
        validUntil
      );

      expect(await registry.isCredentialValid(CRED_EXPIRING)).to.be.true;

      // Majukan waktu melewati validUntil
      await time.increaseTo(validUntil + 10);

      expect(await registry.isCredentialValid(CRED_EXPIRING)).to.be.false;
    });
  });
});
