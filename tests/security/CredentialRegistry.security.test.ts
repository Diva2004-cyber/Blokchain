import { expect } from "chai";
import { ethers } from "hardhat";
import { CredentialRegistry } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("CredentialRegistry - Security & Threat-Driven Negative Tests (M2 / M7)", function () {
  let registry: CredentialRegistry;
  let admin: HardhatEthersSigner;
  let authorizedIssuer: HardhatEthersSigner;
  let unauthorizedIssuer: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;

  const ISSUER_A = "did:web:kampus-a.ac.id";
  const ISSUER_B = "did:web:kampus-b.ac.id";
  const KEY_A = "did:web:kampus-a.ac.id#key-1";
  const KEY_B = "did:web:kampus-b.ac.id#key-1";

  const CRED_A = ethers.keccak256(ethers.toUtf8Bytes("diploma:kampus-a:001"));
  const COMMIT_A = ethers.keccak256(ethers.toUtf8Bytes("commitment-payload-a"));
  const SCHEMA_V1 = 1;

  beforeEach(async function () {
    [admin, authorizedIssuer, unauthorizedIssuer, attacker] = await ethers.getSigners();

    const RegistryFactory = await ethers.getContractFactory("CredentialRegistry");
    registry = (await RegistryFactory.deploy()) as unknown as CredentialRegistry;
    await registry.waitForDeployment();

    // Register Issuer A as legitimate issuer
    await registry.connect(admin)["registerIssuer(string,address,string)"](
      ISSUER_A,
      authorizedIssuer.address,
      KEY_A
    );

    // Register Issuer B as another legitimate issuer
    await registry.connect(admin)["registerIssuer(string,address,string)"](
      ISSUER_B,
      unauthorizedIssuer.address,
      KEY_B
    );
  });

  describe("Threat T-01: Unauthorized Issuer Governance", function () {
    it("PENYERANG TIDAK BISA mendaftarkan dirinya sendiri sebagai issuer", async function () {
      await expect(
        registry.connect(attacker)["registerIssuer(string,address,string)"](
          "did:web:fake-university.ac.id",
          attacker.address,
          "fake-key"
        )
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller").withArgs(attacker.address);
    });

    it("PENYERANG TIDAK BISA mengubah status aktif/non-aktif issuer", async function () {
      await expect(
        registry.connect(attacker).setIssuerStatus(ISSUER_A, false)
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller").withArgs(attacker.address);
    });

    it("PENYERANG TIDAK BISA mengambil alih peran Governance Admin", async function () {
      await expect(
        registry.connect(attacker).transferAdmin(attacker.address)
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller").withArgs(attacker.address);
    });
  });

  describe("Threat T-02: Unauthorized & Forged Credential Issuance", function () {
    it("PENYERANG TIDAK BISA menerbitkan kredensial mengatasnamakan Issuer A", async function () {
      await expect(
        registry.connect(attacker).issueCredential(
          CRED_A,
          ISSUER_A,
          COMMIT_A,
          SCHEMA_V1,
          0
        )
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller").withArgs(attacker.address);
    });

    it("ISSUER B TIDAK BISA menerbitkan kredensial mengatasnamakan Issuer A (Cross-Issuer Forgery)", async function () {
      await expect(
        registry.connect(unauthorizedIssuer).issueCredential(
          CRED_A,
          ISSUER_A,
          COMMIT_A,
          SCHEMA_V1,
          0
        )
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller").withArgs(unauthorizedIssuer.address);
    });

    it("PENYERANG TIDAK BISA menerbitkan kredensial dengan issuerId fiktif/tidak terdaftar", async function () {
      await expect(
        registry.connect(attacker).issueCredential(
          CRED_A,
          "did:web:nonexistent.ac.id",
          COMMIT_A,
          SCHEMA_V1,
          0
        )
      ).to.be.revertedWithCustomError(registry, "IssuerNotFound").withArgs("did:web:nonexistent.ac.id");
    });
  });

  describe("Threat T-03: Deactivated/Inactive Issuer Protection", function () {
    it("ISSUER YANG DINONAKTIFKAN TIDAK BISA menerbitkan kredensial baru", async function () {
      // Admin menonaktifkan Issuer A karena investigasi
      await registry.connect(admin).setIssuerStatus(ISSUER_A, false);

      await expect(
        registry.connect(authorizedIssuer).issueCredential(
          CRED_A,
          ISSUER_A,
          COMMIT_A,
          SCHEMA_V1,
          0
        )
      ).to.be.revertedWithCustomError(registry, "IssuerInactive").withArgs(ISSUER_A);
    });
  });

  describe("Threat T-04: Cross-Issuer Lifecycle Tampering", function () {
    beforeEach(async function () {
      // Issuer A menerbitkan kredensial resmi
      await registry.connect(authorizedIssuer).issueCredential(
        CRED_A,
        ISSUER_A,
        COMMIT_A,
        SCHEMA_V1,
        0
      );
    });

    it("PENYERANG TIDAK BISA mencabut atau menangguhkan kredensial milik orang lain", async function () {
      await expect(
        registry.connect(attacker).suspendCredential(CRED_A, "Malicious suspend")
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller").withArgs(attacker.address);

      await expect(
        registry.connect(attacker).revokeCredential(CRED_A, "Malicious revoke")
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller").withArgs(attacker.address);
    });

    it("ISSUER B TIDAK BISA mencabut kredensial yang diterbitkan oleh Issuer A", async function () {
      await expect(
        registry.connect(unauthorizedIssuer).revokeCredential(CRED_A, "Cross-issuer sabotage")
      ).to.be.revertedWithCustomError(registry, "UnauthorizedCaller").withArgs(unauthorizedIssuer.address);
    });
  });

  describe("Threat T-05: Terminal State Inviolability (Revocation Cannot Be Undone)", function () {
    beforeEach(async function () {
      await registry.connect(authorizedIssuer).issueCredential(
        CRED_A,
        ISSUER_A,
        COMMIT_A,
        SCHEMA_V1,
        0
      );
      // Cabut kredensial secara sah
      await registry.connect(authorizedIssuer).revokeCredential(CRED_A, "Pemalsuan dokumen terbukti");
    });

    it("KREDENSIAL YANG SUDAH DICABUT (REVOKED) TIDAK DAPAT DIAKTIFKAN KEMBALI", async function () {
      // Issuer A mencoba mengaktifkan kembali
      await expect(
        registry.connect(authorizedIssuer).reactivateCredential(CRED_A)
      ).to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked").withArgs(CRED_A);

      // Bahkan Admin tata kelola tidak bisa menghidupkan kembali kredensial REVOKED
      await expect(
        registry.connect(admin).reactivateCredential(CRED_A)
      ).to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked").withArgs(CRED_A);
    });

    it("KREDENSIAL YANG SUDAH DICABUT (REVOKED) TIDAK BISA DIUBAH MENJADI SUSPENDED", async function () {
      await expect(
        registry.connect(authorizedIssuer).suspendCredential(CRED_A, "Ubah ke suspended")
      ).to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked").withArgs(CRED_A);
    });
  });

  describe("Threat T-06: Non-Existent Entity Probing", function () {
    it("Revert dengan CredentialNotFound jika entitas kredensial tidak pernah diterbitkan", async function () {
      const nonExistentId = ethers.keccak256(ethers.toUtf8Bytes("random-nonexistent-id"));

      await expect(
        registry.connect(authorizedIssuer).suspendCredential(nonExistentId, "test")
      ).to.be.revertedWithCustomError(registry, "CredentialNotFound").withArgs(nonExistentId);

      await expect(
        registry.connect(authorizedIssuer).revokeCredential(nonExistentId, "test")
      ).to.be.revertedWithCustomError(registry, "CredentialNotFound").withArgs(nonExistentId);

      await expect(
        registry.getCredential(nonExistentId)
      ).to.be.revertedWithCustomError(registry, "CredentialNotFound").withArgs(nonExistentId);
    });

    it("Revert dengan IssuerNotFound jika entitas issuer tidak pernah didaftarkan", async function () {
      await expect(
        registry.getIssuer("did:web:unknown-entity.com")
      ).to.be.revertedWithCustomError(registry, "IssuerNotFound").withArgs("did:web:unknown-entity.com");
    });
  });
});
