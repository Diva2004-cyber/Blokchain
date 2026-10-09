import { ethers } from "ethers";
import {
  VerifiableCredential,
  VerificationResult,
  VerifierRequest,
  VerifiablePresentation,
  PresentationVerificationResult,
} from "../types/credential";
import {
  canonicalizeJson,
  computeCredentialCommitment,
  stringToBytes32Id,
} from "../crypto/canonical";
import { verifyCredentialSignature } from "../crypto/signer";

export class VerificationService {
  private registryContract?: ethers.Contract;
  private usedNonces = new Set<string>();

  constructor(options?: { registryContract?: ethers.Contract }) {
    this.registryContract = options?.registryContract;
  }

  /**
   * Memverifikasi satu Verifiable Credential secara berlapis (6-layer verification)
   * Sesuai PRD Section 10 & 18 (Milestone M4)
   */
  public async verifyCredential(
    vc: VerifiableCredential,
    referenceTime?: Date
  ): Promise<VerificationResult> {
    const now = referenceTime || new Date();
    const nowUnix = Math.floor(now.getTime() / 1000);

    const credentialId = vc.id;
    const credentialIdOnChain =
      vc.credentialStatus?.credentialIdOnChain || stringToBytes32Id(credentialId);

    const reasons: string[] = [];
    const checks = {
      structure: false,
      signature: false,
      issuerRegistered: false,
      issuerActive: false,
      onChainStatus: false,
      integrityCommitment: false,
      validityPeriod: true,
    };

    // 1. Validasi Struktur Dasar
    if (
      !vc["@context"] ||
      !vc.type ||
      !vc.issuer ||
      !vc.credentialSubject ||
      !vc.proof
    ) {
      reasons.push("STRUKTUR_TIDAK_LENGKAP: Field wajib W3C tidak terpenuhi");
      return {
        isValid: false,
        credentialId,
        credentialIdOnChain,
        status: "NOT_FOUND",
        reasons,
        checks,
        timestamp: now.toISOString(),
      };
    }
    checks.structure = true;

    // 2. Rekonstruksi Komitmen Integritas Off-Chain
    const computedCommitment = computeCredentialCommitment(
      vc.credentialSubject,
      credentialId
    );

    // 3. Verifikasi Tanda Tangan Digital (ECDSA)
    const unsignedPayload = {
      "@context": vc["@context"],
      id: vc.id,
      type: vc.type,
      issuer: {
        id: vc.issuer.id,
        name: vc.issuer.name,
        ethereumAddress: vc.issuer.ethereumAddress,
      },
      validFrom: vc.validFrom,
      ...(vc.validUntil ? { validUntil: vc.validUntil } : {}),
      credentialSubject: vc.credentialSubject,
      commitment: computedCommitment,
    };
    const canonicalString = canonicalizeJson(unsignedPayload);

    const isSignatureValid = verifyCredentialSignature(
      canonicalString,
      vc.proof.proofValue,
      vc.issuer.ethereumAddress
    );

    if (isSignatureValid) {
      checks.signature = true;
    } else {
      reasons.push("TANDA_TANGAN_TIDAK_SAH: Signature tidak cocok dengan alamat issuer");
    }

    // 4. Verifikasi Status & Integritas ke Smart Contract On-Chain
    let onChainDetails: any = undefined;

    if (this.registryContract) {
      try {
        // A. Cek Status Pendaftaran Issuer
        const issuerData = await this.registryContract.getIssuer(vc.issuer.id);
        if (
          issuerData.issuerAddress.toLowerCase() ===
          vc.issuer.ethereumAddress.toLowerCase()
        ) {
          checks.issuerRegistered = true;
          if (issuerData.active) {
            checks.issuerActive = true;
          } else {
            reasons.push("ISSUER_NONAKTIF: Institusi penerbit berstatus suspended/nonaktif");
          }
        } else {
          reasons.push("ISSUER_TIDAK_COCOK: Alamat Ethereum issuer tidak cocok dengan registry");
        }
      } catch (err: any) {
        reasons.push(`ISSUER_TIDAK_TERDAFTAR: ${vc.issuer.id} tidak terdaftar di blockchain`);
      }

      try {
        // B. Cek Status Kredensial di Registry
        const credRecord = await this.registryContract.getCredential(
          credentialIdOnChain
        );

        onChainDetails = {
          commitment: credRecord.commitment,
          status: Number(credRecord.status),
          validUntil: Number(credRecord.validUntil),
          issuerId: credRecord.issuerId,
        };

        // C. Cek Kesesuaian Komitmen Integritas (Tamper Detection)
        if (credRecord.commitment.toLowerCase() === computedCommitment.toLowerCase()) {
          checks.integrityCommitment = true;
        } else {
          reasons.push("DATA_DIPALSUKAN: Hash komitmen off-chain tidak cocok dengan jangkar on-chain");
        }

        // D. Cek Status Siklus Hidup (1 = ACTIVE, 2 = SUSPENDED, 3 = REVOKED)
        const statusCode = Number(credRecord.status);
        if (statusCode === 1) {
          checks.onChainStatus = true;
        } else if (statusCode === 2) {
          reasons.push("KREDENSIAL_DITANGGUHKAN: Status saat ini SUSPENDED");
        } else if (statusCode === 3) {
          reasons.push("KREDENSIAL_DICABUT: Status saat ini REVOKED (Permanen)");
        } else {
          reasons.push("KREDENSIAL_BELUM_TERBIT: Status on-chain bernilai NONE");
        }

        // E. Cek Masa Berlaku (Expiry)
        if (credRecord.validUntil > 0 && nowUnix > Number(credRecord.validUntil)) {
          checks.validityPeriod = false;
          reasons.push("KREDENSIAL_KEDALUWARSA: Masa berlaku on-chain telah habis");
        }
      } catch (err: any) {
        reasons.push("KREDENSIAL_TIDAK_DITEMUKAN: Credential ID tidak terdaftar di blockchain");
      }
    } else {
      // Fallback validasi lokal jika tanpa koneksi contract (misal verifikasi format murni)
      checks.issuerRegistered = true;
      checks.issuerActive = true;
      checks.onChainStatus = true;
      checks.integrityCommitment = true;
    }

    // Cek Expiry dari berkas VC off-chain jika ada
    if (vc.validUntil) {
      const validUntilUnixOffchain = Math.floor(
        new Date(vc.validUntil).getTime() / 1000
      );
      if (nowUnix > validUntilUnixOffchain) {
        checks.validityPeriod = false;
        if (!reasons.includes("KREDENSIAL_KEDALUWARSA: Masa berlaku on-chain telah habis")) {
          reasons.push("KREDENSIAL_KEDALUWARSA: Masa berlaku off-chain telah habis");
        }
      }
    }

    // Tentukan status akhir
    let finalStatus: VerificationResult["status"] = "ACTIVE";
    if (!checks.integrityCommitment) {
      finalStatus = "TAMPERED";
    } else if (!checks.signature) {
      finalStatus = "INVALID_SIGNATURE";
    } else if (!checks.validityPeriod) {
      finalStatus = "EXPIRED";
    } else if (onChainDetails && onChainDetails.status === 2) {
      finalStatus = "SUSPENDED";
    } else if (onChainDetails && onChainDetails.status === 3) {
      finalStatus = "REVOKED";
    } else if (!checks.onChainStatus) {
      finalStatus = "NOT_FOUND";
    }

    const isValid =
      checks.structure &&
      checks.signature &&
      checks.issuerRegistered &&
      checks.issuerActive &&
      checks.onChainStatus &&
      checks.integrityCommitment &&
      checks.validityPeriod;

    return {
      isValid,
      credentialId,
      credentialIdOnChain,
      status: finalStatus,
      reasons,
      checks,
      onChainDetails,
      timestamp: now.toISOString(),
    };
  }

  /**
   * Memverifikasi Verifiable Presentation terhadap Verifier Request
   * Termasuk pencegahan Replay Attack (AT-08) dan pengecekan Audience / Nonce
   */
  public async verifyPresentation(
    presentation: VerifiablePresentation,
    request: VerifierRequest,
    referenceTime?: Date
  ): Promise<PresentationVerificationResult> {
    const now = referenceTime || new Date();
    const reasons: string[] = [];

    const checks = {
      nonceValid: false,
      audienceValid: false,
      requestNotExpired: false,
      credentialsValid: false,
      requiredAttributesSupplied: false,
    };

    // 1. Cek masa berlaku request
    const requestExpiresAtUnix = new Date(request.expiresAt).getTime();
    if (now.getTime() > requestExpiresAtUnix) {
      reasons.push("PERMINTAAN_KEDALUWARSA: Sesi Verifier Request telah habis");
    } else {
      checks.requestNotExpired = true;
    }

    // 2. Cek Audience
    if (presentation.presentationSubmission.audience === request.audience) {
      checks.audienceValid = true;
    } else {
      reasons.push("AUDIENCE_TIDAK_COCOK: Audience presentasi tidak sesuai dengan request");
    }

    // 3. Cek Nonce & Pencegahan Replay Attack (AT-08)
    if (presentation.presentationSubmission.nonce !== request.nonce) {
      reasons.push("NONCE_TIDAK_COCOK: Challenge nonce tidak sesuai");
    } else if (this.usedNonces.has(request.nonce)) {
      reasons.push("REPLAY_ATTACK_DETECTED: Nonce telah digunakan sebelumnya (one-time nonce violation)");
    } else {
      checks.nonceValid = true;
      if (request.oneTimeNonce !== false) {
        this.usedNonces.add(request.nonce);
      }
    }

    // 4. Verifikasi setiap Kredensial di dalam presentasi
    const credentialResults: VerificationResult[] = [];
    let allCredsValid = true;

    for (const vc of presentation.verifiableCredential || []) {
      const result = await this.verifyCredential(vc, now);
      credentialResults.push(result);
      if (!result.isValid) {
        allCredsValid = false;
        reasons.push(...result.reasons);
      }
    }
    checks.credentialsValid = allCredsValid && credentialResults.length > 0;

    // 5. Cek atribut yang diminta (Selective Disclosure / Required Claims)
    if (presentation.verifiableCredential && presentation.verifiableCredential.length > 0) {
      const subject = presentation.verifiableCredential[0].credentialSubject as any;
      const missingAttributes = request.requestedAttributes.filter(
        (attr) => subject[attr] === undefined || subject[attr] === null
      );
      if (missingAttributes.length === 0) {
        checks.requiredAttributesSupplied = true;
      } else {
        reasons.push(`ATRIBUT_TIDAK_LENGKAP: Klaim [${missingAttributes.join(", ")}] tidak disertakan`);
      }
    }

    const isValid =
      checks.nonceValid &&
      checks.audienceValid &&
      checks.requestNotExpired &&
      checks.credentialsValid &&
      checks.requiredAttributesSupplied;

    return {
      isValid,
      requestId: request.requestId,
      reasons,
      credentialResults,
      checks,
      timestamp: now.toISOString(),
    };
  }
}
