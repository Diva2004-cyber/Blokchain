import { ethers } from "ethers";
import { stringToBytes32Id } from "../crypto/canonical";

export type CredentialStatusString = "NONE" | "ACTIVE" | "SUSPENDED" | "REVOKED";

export interface StatusChangeResult {
  success: boolean;
  credentialId: string;
  credentialIdOnChain: string;
  previousStatus: CredentialStatusString;
  newStatus: CredentialStatusString;
  reasonRef?: string;
  transactionHash: string;
  blockNumber: number;
}

export interface AuditRecord {
  credentialId: string;
  credentialIdOnChain: string;
  previousStatus: CredentialStatusString;
  newStatus: CredentialStatusString;
  reasonRef: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

const STATUS_MAP: Record<number, CredentialStatusString> = {
  0: "NONE",
  1: "ACTIVE",
  2: "SUSPENDED",
  3: "REVOKED",
};

export class LifecycleService {
  private registryContract: ethers.Contract;
  private defaultSigner?: ethers.Signer | ethers.Wallet;

  constructor(options: {
    registryContract: ethers.Contract;
    defaultSigner?: ethers.Signer | ethers.Wallet;
  }) {
    this.registryContract = options.registryContract;
    this.defaultSigner = options.defaultSigner;
  }

  /**
   * Menangguhkan kredensial yang sedang aktif (ACTIVE -> SUSPENDED)
   */
  public async suspendCredential(
    credentialId: string,
    reasonRef: string,
    signerOverride?: ethers.Signer | ethers.Wallet
  ): Promise<StatusChangeResult> {
    const signer = signerOverride || this.defaultSigner;
    if (!signer) {
      throw new Error("Signer diperlukan untuk menandatangani transaksi status change");
    }

    const credentialIdOnChain = stringToBytes32Id(credentialId);
    const contractWithSigner = this.registryContract.connect(signer) as any;

    const tx = await contractWithSigner.suspendCredential(credentialIdOnChain, reasonRef);
    const receipt = await tx.wait();

    return {
      success: true,
      credentialId,
      credentialIdOnChain,
      previousStatus: "ACTIVE",
      newStatus: "SUSPENDED",
      reasonRef,
      transactionHash: receipt?.hash || tx.hash,
      blockNumber: receipt?.blockNumber || 0,
    };
  }

  /**
   * Mengaktifkan kembali kredensial yang sedang ditangguhkan (SUSPENDED -> ACTIVE)
   */
  public async reactivateCredential(
    credentialId: string,
    signerOverride?: ethers.Signer | ethers.Wallet
  ): Promise<StatusChangeResult> {
    const signer = signerOverride || this.defaultSigner;
    if (!signer) {
      throw new Error("Signer diperlukan untuk menandatangani transaksi status change");
    }

    const credentialIdOnChain = stringToBytes32Id(credentialId);
    const contractWithSigner = this.registryContract.connect(signer) as any;

    const tx = await contractWithSigner.reactivateCredential(credentialIdOnChain);
    const receipt = await tx.wait();

    return {
      success: true,
      credentialId,
      credentialIdOnChain,
      previousStatus: "SUSPENDED",
      newStatus: "ACTIVE",
      reasonRef: "Reactivated",
      transactionHash: receipt?.hash || tx.hash,
      blockNumber: receipt?.blockNumber || 0,
    };
  }

  /**
   * Mencabut kredensial secara permanen (ACTIVE / SUSPENDED -> REVOKED)
   * Status ini bersifat terminal dan tidak dapat diubah kembali.
   */
  public async revokeCredential(
    credentialId: string,
    reasonRef: string,
    signerOverride?: ethers.Signer | ethers.Wallet
  ): Promise<StatusChangeResult> {
    const signer = signerOverride || this.defaultSigner;
    if (!signer) {
      throw new Error("Signer diperlukan untuk menandatangani transaksi status change");
    }

    const credentialIdOnChain = stringToBytes32Id(credentialId);

    // Dapatkan status sebelum transaksi untuk pelaporan
    const currentRecord = await this.registryContract.getCredential(credentialIdOnChain);
    const previousStatus = STATUS_MAP[Number(currentRecord.status)] || "NONE";

    const contractWithSigner = this.registryContract.connect(signer) as any;

    const tx = await contractWithSigner.revokeCredential(credentialIdOnChain, reasonRef);
    const receipt = await tx.wait();

    return {
      success: true,
      credentialId,
      credentialIdOnChain,
      previousStatus,
      newStatus: "REVOKED",
      reasonRef,
      transactionHash: receipt?.hash || tx.hash,
      blockNumber: receipt?.blockNumber || 0,
    };
  }

  /**
   * Mengambil status on-chain kredensial saat ini
   */
  public async getCredentialStatus(credentialId: string): Promise<{
    credentialId: string;
    credentialIdOnChain: string;
    status: CredentialStatusString;
    issuerId: string;
    validUntil: number;
    updatedAt: number;
  }> {
    const credentialIdOnChain = stringToBytes32Id(credentialId);
    const record = await this.registryContract.getCredential(credentialIdOnChain);

    return {
      credentialId,
      credentialIdOnChain,
      status: STATUS_MAP[Number(record.status)] || "NONE",
      issuerId: record.issuerId,
      validUntil: Number(record.validUntil),
      updatedAt: Number(record.updatedAt),
    };
  }

  /**
   * Mengambil riwayat audit log perubahan status (Audit Trail)
   * Berdasarkan event CredentialStatusChanged pada Smart Contract
   */
  public async getAuditHistory(credentialId: string): Promise<AuditRecord[]> {
    const credentialIdOnChain = stringToBytes32Id(credentialId);

    // Filter event CredentialStatusChanged dengan indexed credentialId
    const filter = this.registryContract.filters.CredentialStatusChanged(credentialIdOnChain);
    const events = await this.registryContract.queryFilter(filter);

    return events.map((event: any) => {
      const args = event.args;
      const rawOld = args.oldStatus !== undefined ? args.oldStatus : (args.previousStatus !== undefined ? args.previousStatus : args[1]);
      const rawNew = args.newStatus !== undefined ? args.newStatus : args[2];
      const rawReason = args.reasonRef !== undefined ? args.reasonRef : args[3];
      const rawTimestamp = args.updatedAt !== undefined ? args.updatedAt : (args.timestamp !== undefined ? args.timestamp : args[4]);

      return {
        credentialId,
        credentialIdOnChain,
        previousStatus: STATUS_MAP[Number(rawOld)] || "NONE",
        newStatus: STATUS_MAP[Number(rawNew)] || "NONE",
        reasonRef: rawReason || "",
        timestamp: Number(rawTimestamp),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };
    });
  }
}
