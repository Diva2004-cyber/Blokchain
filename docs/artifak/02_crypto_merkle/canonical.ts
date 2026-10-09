import { ethers } from "ethers";
import { CredentialSubject } from "../types/credential";

/**
 * Serialisasi JSON secara deterministik dengan pengurutan kunci rekursif.
 * Memastikan payload selalu menghasilkan representasi biner yang identik.
 */
export function canonicalizeJson(value: any): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return "[" + value.map((item) => canonicalizeJson(item)).join(",") + "]";
  }

  const sortedKeys = Object.keys(value).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`
  );
  return "{" + entries.join(",") + "}";
}

/**
 * Menghitung komitmen integritas kriptografis (keccak256 hash)
 * dari subject data akademik dan credentialId.
 * Sesuai Dokumen Arsitektur vc_data_model.md Bab 4.
 */
export function computeCredentialCommitment(
  subject: CredentialSubject,
  credentialId: string
): string {
  const canonicalPayload = canonicalizeJson({
    id: credentialId,
    credentialSubject: subject,
  });

  return ethers.keccak256(ethers.toUtf8Bytes(canonicalPayload));
}

/**
 * Mengonversi string URN/URI identifier menjadi bytes32 deterministik
 * untuk referensi pada smart contract.
 */
export function stringToBytes32Id(identifier: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(identifier));
}
