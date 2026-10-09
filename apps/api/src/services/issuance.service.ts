import { ethers } from "ethers";
import {
  CredentialSubject,
  IssuerInfo,
  VerifiableCredential,
  IssueCredentialRequest,
  IssueCredentialResponse,
} from "../types/credential";
import {
  canonicalizeJson,
  computeCredentialCommitment,
  stringToBytes32Id,
} from "../crypto/canonical";
import { signCredentialPayload } from "../crypto/signer";

export class IssuanceService {
  private registryContract?: ethers.Contract;
  private issuerSigner?: ethers.Signer | ethers.Wallet;
  private registryAddress: string;

  constructor(options?: {
    registryContract?: ethers.Contract;
    issuerSigner?: ethers.Signer | ethers.Wallet;
    registryAddress?: string;
  }) {
    this.registryContract = options?.registryContract;
    this.issuerSigner = options?.issuerSigner;
    this.registryAddress =
      options?.registryAddress ||
      process.env.REGISTRY_CONTRACT_ADDRESS ||
      "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  }

  /**
   * Memvalidasi kelengkapan data akademik sintetik
   */
  public validateSubjectData(subject: CredentialSubject): void {
    if (!subject.fullName || subject.fullName.trim() === "") {
      throw new Error("Validation Error: fullName tidak boleh kosong");
    }
    if (!subject.studentIdentifier || subject.studentIdentifier.trim() === "") {
      throw new Error("Validation Error: studentIdentifier tidak boleh kosong");
    }
    if (!subject.degreeName || subject.degreeName.trim() === "") {
      throw new Error("Validation Error: degreeName tidak boleh kosong");
    }
    if (!subject.studyProgram || subject.studyProgram.trim() === "") {
      throw new Error("Validation Error: studyProgram tidak boleh kosong");
    }
    if (!subject.gpa || subject.gpa.trim() === "") {
      throw new Error("Validation Error: gpa tidak boleh kosong");
    }
  }

  /**
   * Menerbitkan Verifiable Credential lengkap dan melakukan anchoring komitmen ke blockchain
   */
  public async issueAndAnchorCredential(
    request: IssueCredentialRequest,
    issuerInfo: IssuerInfo,
    signerOverride?: ethers.Signer | ethers.Wallet
  ): Promise<IssueCredentialResponse> {
    this.validateSubjectData(request.credentialSubject);

    const credentialId =
      request.customId ||
      `urn:credential:academic:${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const credentialIdOnChain = stringToBytes32Id(credentialId);
    const commitment = computeCredentialCommitment(
      request.credentialSubject,
      credentialId
    );

    const validFrom = request.validFrom || new Date().toISOString();
    const validUntilUnix = request.validUntil
      ? Math.floor(new Date(request.validUntil).getTime() / 1000)
      : 0;

    const signer = signerOverride || this.issuerSigner;

    // 1. Buat payload kanonikal untuk penandatanganan proof
    const unsignedVcPayload = {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://example.edu/schemas/academic-v2",
      ],
      id: credentialId,
      type: ["VerifiableCredential", "AcademicDegreeCredential"],
      issuer: {
        id: issuerInfo.id,
        name: issuerInfo.name,
        ethereumAddress: issuerInfo.ethereumAddress,
      },
      validFrom,
      ...(request.validUntil ? { validUntil: request.validUntil } : {}),
      credentialSubject: request.credentialSubject,
      commitment,
    };

    const canonicalString = canonicalizeJson(unsignedVcPayload);

    // 2. Buat ECDSA digital signature
    let proofValue = "0x";
    if (signer) {
      proofValue = await signCredentialPayload(canonicalString, signer);
    }

    // 3. Susun dokumen Verifiable Credential lengkap W3C
    const vc: VerifiableCredential = {
      "@context": unsignedVcPayload["@context"],
      id: credentialId,
      type: unsignedVcPayload.type,
      issuer: unsignedVcPayload.issuer,
      validFrom,
      ...(request.validUntil ? { validUntil: request.validUntil } : {}),
      credentialSubject: request.credentialSubject,
      credentialStatus: {
        id: `${credentialId}#status`,
        type: "EthereumCredentialRegistry2026",
        registryAddress: this.registryAddress,
        credentialIdOnChain,
      },
      proof: {
        type: "EthereumEcdsaSignature2026",
        created: new Date().toISOString(),
        verificationMethod:
          issuerInfo.verificationMethod || `${issuerInfo.id}#key-1`,
        proofPurpose: "assertionMethod",
        proofValue,
      },
    };

    // 4. Lakukan anchoring on-chain jika contract & signer tersedia
    let transactionHash: string | undefined;
    let blockNumber: number | undefined;

    if (this.registryContract && signer) {
      const contractWithSigner = this.registryContract.connect(signer) as any;
      const tx = await contractWithSigner.issueCredential(
        credentialIdOnChain,
        issuerInfo.id,
        commitment,
        1, // schemaVersion
        validUntilUnix
      );
      const receipt = await tx.wait();
      transactionHash = receipt?.hash || tx.hash;
      blockNumber = receipt?.blockNumber;
    }

    return {
      success: true,
      credential: vc,
      commitment,
      credentialIdOnChain,
      transactionHash,
      blockNumber,
    };
  }

  /**
   * Membuat Verifiable Credential bertanda tangan digital murni (off-chain)
   * tanpa melakukan transaksi anchoring ke Smart Contract.
   */
  public async createSignedCredential(
    request: IssueCredentialRequest,
    issuerInfo: IssuerInfo,
    signerOverride?: ethers.Signer | ethers.Wallet
  ): Promise<VerifiableCredential> {
    this.validateSubjectData(request.credentialSubject);

    const credentialId =
      request.customId ||
      `urn:credential:academic:${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const credentialIdOnChain = stringToBytes32Id(credentialId);
    const commitment = computeCredentialCommitment(
      request.credentialSubject,
      credentialId
    );

    const validFrom = request.validFrom || new Date().toISOString();
    const signer = signerOverride || this.issuerSigner;

    const unsignedVcPayload = {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://example.edu/schemas/academic-v2",
      ],
      id: credentialId,
      type: ["VerifiableCredential", "AcademicDegreeCredential"],
      issuer: {
        id: issuerInfo.id,
        name: issuerInfo.name,
        ethereumAddress: issuerInfo.ethereumAddress,
      },
      validFrom,
      ...(request.validUntil ? { validUntil: request.validUntil } : {}),
      credentialSubject: request.credentialSubject,
      commitment,
    };

    const canonicalString = canonicalizeJson(unsignedVcPayload);

    let proofValue = "0x";
    if (signer) {
      proofValue = await signCredentialPayload(canonicalString, signer);
    }

    return {
      "@context": unsignedVcPayload["@context"],
      id: credentialId,
      type: unsignedVcPayload.type,
      issuer: unsignedVcPayload.issuer,
      validFrom,
      ...(request.validUntil ? { validUntil: request.validUntil } : {}),
      credentialSubject: request.credentialSubject,
      credentialStatus: {
        id: `${credentialId}#status`,
        type: "EthereumCredentialRegistry2026",
        registryAddress: this.registryAddress,
        credentialIdOnChain,
      },
      proof: {
        type: "EthereumEcdsaSignature2026",
        created: new Date().toISOString(),
        verificationMethod:
          issuerInfo.verificationMethod || `${issuerInfo.id}#key-1`,
        proofPurpose: "assertionMethod",
        proofValue,
      },
    };
  }
}

