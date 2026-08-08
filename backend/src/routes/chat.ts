import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { invokeIncidentAgent } from "../services/incidentAgent.js";
import { createSession, getSession } from "../services/sessionStore.js";
import type { ServiceName } from "../services/mockServices/types.js";

const VALID_SERVICES = new Set<ServiceName>(["payment", "cart", "order"]);

const router = Router();

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, sessionId: existingSessionId, serviceName, investigation } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({
        error: "Invalid input: 'message' is required and must be a non-empty string.",
      });
      return;
    }

    const sessionId = existingSessionId || uuidv4();
    const svcName =
      typeof serviceName === "string" && VALID_SERVICES.has(serviceName as ServiceName)
        ? (serviceName as ServiceName)
        : undefined;

    const result = await invokeIncidentAgent(message, sessionId, {
      serviceName: svcName,
      investigation,
    });

    res.json({
      sessionId: result.sessionId,
      message: result.response,
      success: result.success,
      hint: result.hint,
      investigation: result.investigation,
    });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err);
    console.error("Chat error:", details);
    res.status(500).json({
      error: "Failed to process incident report.",
      details,
    });
  }
});

router.get("/sessions/:sessionId", (req: Request, res: Response) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({
    id: session.id,
    createdAt: session.createdAt,
    messageCount: session.messageCount,
    lastMessageAt: session.lastMessageAt,
  });
});

router.post("/sessions", (_req: Request, res: Response) => {
  const sessionId = uuidv4();
  createSession(sessionId);
  res.status(201).json({ sessionId });
});

export default router;
