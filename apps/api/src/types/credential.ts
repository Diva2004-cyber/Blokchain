export interface IssuerInfo {
  id: string;
  name: string;
  ethereumAddress: string;
  verificationMethod?: string;
  active?: boolean;
}

export interface CredentialSubject {
  id: string;
  studentIdentifier: string;
  fullName: string;
  degreeName: string;
  studyProgram: string;
  faculty: string;
  gpa: string;
  graduationDate: string;
  honors?: string;
}

export interface CredentialStatus {
  id: string;
  type: string;
  registryAddress: string;
  credentialIdOnChain: string;
}

export interface CredentialProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
}

export interface VerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: IssuerInfo;
  validFrom: string;
  validUntil?: string;
  credentialSubject: CredentialSubject;
  credentialStatus: CredentialStatus;
  proof: CredentialProof;
}

export interface IssueCredentialRequest {
  issuerId: string;
  credentialSubject: CredentialSubject;
  validFrom?: string;
  validUntil?: string;
  customId?: string;
}

export interface IssueCredentialResponse {
  success: boolean;
  credential: VerifiableCredential;
  commitment: string;
  credentialIdOnChain: string;
  transactionHash?: string;
  blockNumber?: number;
}

export interface VerifierRequest {
  requestId: string;
  purpose: string;
  verifier: {
    id: string;
    name: string;
    ethereumAddress: string;
  };
  audience: string;
  nonce: string;
  requestedAttributes: string[];
  expiresAt: string;
  oneTimeNonce?: boolean;
}

export interface VerifiablePresentation {
  "@context": string[];
  type: string[];
  verifiableCredential: VerifiableCredential[];
  presentationSubmission: {
    requestId: string;
    nonce: string;
    audience: string;
  };
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    challenge: string;
    domain: string;
    proofValue: string;
  };
}

export interface VerificationCheckStep {
  name: string;
  passed: boolean;
  message?: string;
}

export interface VerificationResult {
  isValid: boolean;
  credentialId: string;
  credentialIdOnChain: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED" | "NOT_FOUND" | "EXPIRED" | "TAMPERED" | "INVALID_SIGNATURE";
  reasons: string[];
  checks: {
    structure: boolean;
    signature: boolean;
    issuerRegistered: boolean;
    issuerActive: boolean;
    onChainStatus: boolean;
    integrityCommitment: boolean;
    validityPeriod: boolean;
  };
  onChainDetails?: {
    commitment: string;
    status: number;
    validUntil: number;
    issuerId: string;
  };
  timestamp: string;
}

export interface PresentationVerificationResult {
  isValid: boolean;
  requestId: string;
  reasons: string[];
  credentialResults: VerificationResult[];
  checks: {
    nonceValid: boolean;
    audienceValid: boolean;
    requestNotExpired: boolean;
    credentialsValid: boolean;
    requiredAttributesSupplied: boolean;
  };
  timestamp: string;
}
