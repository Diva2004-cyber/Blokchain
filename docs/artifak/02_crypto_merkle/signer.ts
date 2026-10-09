import { ethers } from "ethers";

/**
 * Menandatangani pesan kanonikal menggunakan private key atau ethers Signer.
 * Menggunakan standar EIP-191 personal_sign via ethers.signMessage.
 */
export async function signCredentialPayload(
  canonicalPayload: string,
  signerOrKey: ethers.Signer | string
): Promise<string> {
  if (typeof signerOrKey === "string") {
    const wallet = new ethers.Wallet(signerOrKey);
    return wallet.signMessage(canonicalPayload);
  } else {
    return signerOrKey.signMessage(canonicalPayload);
  }
}

/**
 * Memulihkan alamat penandatangan dari payload dan signature.
 */
export function recoverSignerAddress(
  canonicalPayload: string,
  signature: string
): string {
  return ethers.verifyMessage(canonicalPayload, signature);
}

/**
 * Memverifikasi apakah signature dibuat oleh alamat Ethereum yang diharapkan.
 */
export function verifyCredentialSignature(
  canonicalPayload: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recovered = recoverSignerAddress(canonicalPayload, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}
