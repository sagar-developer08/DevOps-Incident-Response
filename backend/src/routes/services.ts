import { Router, type Request, type Response } from "express";
import {
  getAllServices,
  getService,
  triggerIncident,
  recoverService,
  listScenarios,
} from "../services/mockServices/registry.js";
import { investigateService } from "../services/diagnostics/investigate.js";
import { TOOL_CATALOG } from "../agent/toolMetadata.js";
import type { ServiceName } from "../services/mockServices/types.js";

const router = Router();
const VALID = new Set<ServiceName>(["payment", "cart", "order"]);

function parseName(name: string): ServiceName | null {
  return VALID.has(name as ServiceName) ? (name as ServiceName) : null;
}

router.get("/tools", (_req, res) => {
  res.json({ tools: TOOL_CATALOG });
});

router.get("/services", (_req, res) => {
  res.json({
    services: getAllServices(),
    scenarios: {
      payment: listScenarios("payment"),
      cart: listScenarios("cart"),
      order: listScenarios("order"),
    },
  });
});

router.get("/services/:name/investigate", async (req, res) => {
  const name = parseName(req.params.name);
  if (!name) {
    res.status(404).json({ error: "Unknown service" });
    return;
  }
  try {
    const investigation = await investigateService(name);
    res.json(investigation);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/services/:name/trigger", async (req, res) => {
  const name = parseName(req.params.name);
  if (!name) {
    res.status(404).json({ error: "Unknown service" });
    return;
  }
  const scenarioId = req.body?.scenarioId as string | undefined;
  if (!scenarioId) {
    res.status(400).json({ error: "scenarioId is required" });
    return;
  }
  try {
    const result = await triggerIncident(name, scenarioId);
    const investigation = await investigateService(name);
    res.json({ ok: true, ...result, investigation });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/services/:name/recover", async (req, res) => {
  const name = parseName(req.params.name);
  if (!name) {
    res.status(404).json({ error: "Unknown service" });
    return;
  }
  const service = recoverService(name);
  res.json({ ok: true, service });
});

router.get("/services/:name", (req, res) => {
  const name = parseName(req.params.name);
  if (!name) {
    res.status(404).json({ error: "Unknown service" });
    return;
  }
  res.json({ service: getService(name), scenarios: listScenarios(name) });
});

export default router;
