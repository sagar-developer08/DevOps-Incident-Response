import { lookupRunbook } from "../../services/diagnostics/runbook.js";
import { tool } from "@strands-agents/sdk";
import { z } from "zod";

export const lookupRunbookTool = tool({
  name: "lookup_runbook",
  description:
    "Look up operational runbooks for known incident types. Use for standard remediation procedures.",
  inputSchema: z.object({
    incident_type: z
      .string()
      .describe(
        "Incident type: service-down, payment-failure, cart-service, order-service, high-cpu, database-connection."
      ),
  }),
  callback: (input) => {
    const incidentType = input.incident_type?.trim();
    if (!incidentType) return "ERROR: incident_type is required.";
    return lookupRunbook(incidentType).raw;
  },
});
