import express, { Request, Response } from "express";
import { IssuanceService } from "./services/issuance.service";
import { LifecycleService } from "./services/lifecycle.service";
import { IssueCredentialRequest } from "./types/credential";
import { stringToBytes32Id } from "./crypto/canonical";

export function createApp(
  issuanceService?: IssuanceService,
  lifecycleService?: LifecycleService
) {
  const app = express();
  app.use(express.json());

  const service = issuanceService || new IssuanceService();

  // In-memory store untuk menyimpan dokumen VC off-chain (simulasi storage/holder)
  const credentialStore = new Map<string, any>();

  // In-memory registry data untuk simulasi jika offline
  const issuerStore = new Map<string, any>([
    [
      "did:web:uis.ac.id",
      {
        id: "did:web:uis.ac.id",
        name: "Universitas Indonesia Sintetis",
        ethereumAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        verificationMethod: "did:web:uis.ac.id#key-1",
        active: true,
      },
    ],
    [
      "did:web:itbs.ac.id",
      {
        id: "did:web:itbs.ac.id",
        name: "Institut Teknologi Bandung Sintetis",
        ethereumAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        verificationMethod: "did:web:itbs.ac.id#key-1",
        active: true,
      },
    ],
  ]);

  // 1. Health check endpoint (PRD Section 11)
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "academic-credential-api",
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Register Issuer endpoint
  app.post("/api/issuers", (req: Request, res: Response) => {
    const { issuerId, name, ethereumAddress, verificationMethod } = req.body;
    if (!issuerId || !ethereumAddress) {
      return res.status(400).json({ error: "issuerId and ethereumAddress are required" });
    }

    const issuer = {
      id: issuerId,
      name: name || issuerId,
      ethereumAddress,
      verificationMethod: verificationMethod || `${issuerId}#key-1`,
      active: true,
    };
    issuerStore.set(issuerId, issuer);

    return res.status(201).json({
      success: true,
      issuer,
    });
  });

  // 3. Get Issuer details
  app.get("/api/issuers/:id", (req: Request, res: Response) => {
    const issuerId = String(req.params.id);
    const issuer = issuerStore.get(issuerId);
    if (!issuer) {
      return res.status(404).json({ error: "Issuer not found" });
    }
    return res.json(issuer);
  });

  // 4. Issue and Anchor Credential endpoint (PRD Section 11)
  app.post("/api/credentials/issue", async (req: Request, res: Response) => {
    try {
      const body: IssueCredentialRequest = req.body;
      const issuer = issuerStore.get(body.issuerId);

      if (!issuer) {
        return res.status(404).json({ error: `Issuer ${body.issuerId} not found` });
      }

      if (!issuer.active) {
        return res.status(403).json({ error: `Issuer ${body.issuerId} is currently inactive` });
      }

      const result = await service.issueAndAnchorCredential(body, issuer);
      credentialStore.set(result.credential.id, result.credential);

      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to issue credential",
      });
    }
  });

  // 5. Retrieve Credential by ID
  app.get("/api/credentials/:id", (req: Request, res: Response) => {
    const id = String(req.params.id);
    const vc = credentialStore.get(id);
    if (!vc) {
      return res.status(404).json({ error: "Credential not found in local store" });
    }

    return res.json({
      success: true,
      credential: vc,
      credentialIdOnChain: stringToBytes32Id(id),
    });
  });

  // 6. Direct Credential Verification endpoint
  app.post("/api/credentials/verify", async (req: Request, res: Response) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ error: "credential payload is required" });
      }

      const verificationService = new (require("./services/verification.service").VerificationService)();
      const result = await verificationService.verifyCredential(credential);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 7. Create Verifier Request endpoint (PRD Section 11)
  const activeRequests = new Map<string, any>();
  app.post("/api/presentations/request", (req: Request, res: Response) => {
    const { purpose, requestedAttributes, audience } = req.body;
    const requestId = `REQ-SYNTH-${Date.now()}`;
    const nonce = `n-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    const verifierRequest = {
      requestId,
      purpose: purpose || "Verifikasi Kredensial Akademik",
      verifier: {
        id: "did:web:techcorp-synthetic.id",
        name: "PT Teknologi Maju Sintetis",
        ethereumAddress: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      },
      audience: audience || "https://techcorp-synthetic.id/verify-callback",
      nonce,
      requestedAttributes: requestedAttributes || ["fullName", "degreeName", "studyProgram", "gpa"],
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins expiry
      oneTimeNonce: true,
    };

    activeRequests.set(requestId, verifierRequest);
    return res.status(201).json(verifierRequest);
  });

  // 8. Verify Presentation endpoint (PRD Section 11)
  const verifierService = new (require("./services/verification.service").VerificationService)();
  app.post("/api/presentations/verify", async (req: Request, res: Response) => {
    try {
      const { presentation, request: rawRequest } = req.body;
      if (!presentation) {
        return res.status(400).json({ error: "presentation payload is required" });
      }

      let request = rawRequest;
      if (!request && presentation.presentationSubmission?.requestId) {
        request = activeRequests.get(presentation.presentationSubmission.requestId);
      }

      if (!request) {
        return res.status(400).json({ error: "Valid verifier request matching presentation is required" });
      }

      const result = await verifierService.verifyPresentation(presentation, request);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // 9. Suspend Credential endpoint (PRD Section 11 - Lifecycle)
  app.post("/api/credentials/:id/suspend", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { reasonRef } = req.body;

      if (!lifecycleService) {
        return res.status(501).json({ error: "LifecycleService not configured with active contract" });
      }

      const result = await lifecycleService.suspendCredential(
        id,
        reasonRef || "Administrative suspension"
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to suspend credential",
      });
    }
  });

  // 10. Reactivate Credential endpoint (PRD Section 11 - Lifecycle)
  app.post("/api/credentials/:id/reactivate", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);

      if (!lifecycleService) {
        return res.status(501).json({ error: "LifecycleService not configured with active contract" });
      }

      const result = await lifecycleService.reactivateCredential(id);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to reactivate credential",
      });
    }
  });

  // 11. Revoke Credential endpoint (PRD Section 11 - Lifecycle)
  app.post("/api/credentials/:id/revoke", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { reasonRef } = req.body;

      if (!lifecycleService) {
        return res.status(501).json({ error: "LifecycleService not configured with active contract" });
      }

      const result = await lifecycleService.revokeCredential(
        id,
        reasonRef || "Permanent revocation"
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to revoke credential",
      });
    }
  });

  // 12. Credential Status endpoint (PRD Section 11)
  app.get("/api/credentials/:id/status", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);

      if (!lifecycleService) {
        return res.status(501).json({ error: "LifecycleService not configured with active contract" });
      }

      const status = await lifecycleService.getCredentialStatus(id);
      return res.json(status);
    } catch (error: any) {
      return res.status(404).json({ error: error.message || "Credential status not found" });
    }
  });

  // 13. Audit Log endpoint (PRD Section 11 & FR-10)
  app.get("/api/audit/:credentialId", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.credentialId);

      if (!lifecycleService) {
        return res.status(501).json({ error: "LifecycleService not configured with active contract" });
      }

      const history = await lifecycleService.getAuditHistory(id);
      return res.json({
        credentialId: id,
        eventCount: history.length,
        history,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  return app;
}

