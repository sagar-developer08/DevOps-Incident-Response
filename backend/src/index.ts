import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { config } from "./config.js";
import chatRoutes from "./routes/chat.js";
import servicesRoutes from "./routes/services.js";
import { invokeAgentDirect } from "./services/incidentAgent.js";

const app = express();

app.use(
  cors({
    origin: config.corsOrigin,
    methods: ["GET", "POST"],
  })
);

// JSON for frontend API
app.use(express.json({ limit: "1mb" }));

// ── Frontend API ──────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    agentMode: "integrated",
    framework: "strands-typescript",
    region: config.awsRegion,
    model: config.bedrockModelId,
    snsConfigured: Boolean(config.snsEscalationTopicArn),
    cloudwatchLogGroup: config.cloudwatchLogGroup,
  });
});

app.use("/api", chatRoutes);
app.use("/api", servicesRoutes);

// ── AgentCore Runtime contract (required for AWS deploy) ────────
app.get("/ping", (_req: Request, res: Response) => {
  res.json({
    status: "Healthy",
    time_of_last_update: Math.floor(Date.now() / 1000),
  });
});

app.post(
  "/invocations",
  express.raw({ type: "*/*" }),
  async (req: Request, res: Response) => {
    try {
      let prompt = "";

      if (Buffer.isBuffer(req.body)) {
        const raw = new TextDecoder().decode(req.body);
        try {
          const parsed = JSON.parse(raw) as { prompt?: string; message?: string };
          prompt = parsed.prompt || parsed.message || raw;
        } catch {
          prompt = raw;
        }
      } else if (typeof req.body === "object" && req.body !== null) {
        const body = req.body as { prompt?: string; message?: string };
        prompt = body.prompt || body.message || "";
      }

      if (!prompt.trim()) {
        res.status(400).json({ error: "Missing prompt in request body." });
        return;
      }

      const response = await invokeAgentDirect(prompt.trim());
      res.json({ response });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Invocations error:", message);
      res.status(500).json({ error: message });
    }
  }
);

// ── Error handling ──────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`DevOps Incident Agent running on http://localhost:${config.port}`);
  console.log(`  Framework : Strands Agents (TypeScript)`);
  console.log(`  Runtime   : Node.js + Express`);
  console.log(`  Region    : ${config.awsRegion}`);
  console.log(`  Model     : ${config.bedrockModelId}`);
  console.log(`  Endpoints : /api/chat, /invocations, /ping, /health`);
});
