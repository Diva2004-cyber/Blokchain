import * as fs from "fs";
import * as crypto from "crypto";
import { canonicalizeJson, computeCredentialCommitment, stringToBytes32Id } from "../apps/api/src/crypto/canonical";

const raw = fs.readFileSync("./data/synthetic/academic_credentials_fixtures.json", "utf-8");
const fixtures = JSON.parse(raw);

console.log("=== HASIL PERHITUNGAN KRIPTOGRAFI AKTUAL DATASET SINTETIS ===\n");

const recordsForMerkle: string[] = [];

fixtures.forEach((item: any, idx: number) => {
  const cred = item.credential;
  const credId = cred.id;
  const subject = cred.credentialSubject;
  const bytes32Id = stringToBytes32Id(credId);
  const commitment = computeCredentialCommitment(subject, credId);
  
  const canonicalPayload = canonicalizeJson({ id: credId, credentialSubject: subject });
  const sha256Hash = crypto.createHash("sha256").update(Buffer.from(canonicalPayload, "utf8")).digest("hex");

  recordsForMerkle.push(commitment);

  console.log(`Record #${idx + 1} (${item.scenarioId}): ${subject.fullName}`);
  console.log(`  Credential ID String : ${credId}`);
  console.log(`  bytes32 Id (On-Chain): ${bytes32Id}`);
  console.log(`  Keccak-256 Commitment: ${commitment}`);
  console.log(`  SHA-256 Hash         : ${sha256Hash}`);
  console.log(`  Canonical Payload    : ${canonicalPayload}\n`);
});

// 2. Uji Efek Longsoran (Avalanche Effect) Aktual
console.log("=== UJI EFEK LONGSORAN (AVALANCHE EFFECT) AKTUAL ===");
const origSubject = fixtures[0].credential.credentialSubject;
const origCredId = fixtures[0].credential.id;
const origCommitment = computeCredentialCommitment(origSubject, origCredId);

// Mutasi 1 karakter: GPA 3.85 -> 3.86
const tamperedSubject = { ...origSubject, gpa: "3.86" };
const tamperedCommitment = computeCredentialCommitment(tamperedSubject, origCredId);

console.log("Original Commitment (gpa: 3.85):", origCommitment);
console.log("Tampered Commitment (gpa: 3.86):", tamperedCommitment);

// Hitung bit difference (Hamming distance)
const origBuf = Buffer.from(origCommitment.slice(2), "hex");
const tampBuf = Buffer.from(tamperedCommitment.slice(2), "hex");
let bitDiffCount = 0;
for (let i = 0; i < origBuf.length; i++) {
  let xor = origBuf[i] ^ tampBuf[i];
  while (xor > 0) {
    if (xor & 1) bitDiffCount++;
    xor >>= 1;
  }
}
const totalBits = origBuf.length * 8; // 256 bits
const diffPercent = ((bitDiffCount / totalBits) * 100).toFixed(2);
console.log(`Hamming Distance: ${bitDiffCount} dari ${totalBits} bit berubah (${diffPercent}% perubahan bit)`);

// 3. Merkle Root Calculation Aktual untuk 4 Record Pertama
console.log("\n=== KALKULASI MERKLE ROOT AKTUAL (4 RECORD PERTAMA) ===");
function hashPair(a: string, b: string): string {
  // Sort order or direct concat
  const combined = Buffer.concat([
    Buffer.from(a.replace("0x", ""), "hex"),
    Buffer.from(b.replace("0x", ""), "hex"),
  ]);
  return "0x" + crypto.createHash("sha256").update(combined).digest("hex");
}

const leaf1 = "0x" + crypto.createHash("sha256").update(recordsForMerkle[0]).digest("hex");
const leaf2 = "0x" + crypto.createHash("sha256").update(recordsForMerkle[1]).digest("hex");
const leaf3 = "0x" + crypto.createHash("sha256").update(recordsForMerkle[2]).digest("hex");
const leaf4 = "0x" + crypto.createHash("sha256").update(recordsForMerkle[3]).digest("hex");

const parent12 = hashPair(leaf1, leaf2);
const parent34 = hashPair(leaf3, leaf4);
const merkleRoot = hashPair(parent12, parent34);

console.log("Leaf 1 (R-01):", leaf1);
console.log("Leaf 2 (R-02):", leaf2);
console.log("Leaf 3 (R-03):", leaf3);
console.log("Leaf 4 (R-04):", leaf4);
console.log("Parent H_12  :", parent12);
console.log("Parent H_34  :", parent34);
console.log("Merkle Root  :", merkleRoot);
