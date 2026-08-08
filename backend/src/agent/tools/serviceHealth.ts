import { checkServiceHealth } from "../../services/diagnostics/health.js";
import { tool } from "@strands-agents/sdk";
import { z } from "zod";

export const checkServiceHealthTool = tool({
  name: "check_service_health",
  description:
    "Check microservice health, ECS status, and CloudWatch alarms. Use for outages or degraded performance.",
  inputSchema: z.object({
    service_name: z.string().optional().describe("Service name: payment, cart, or order."),
  }),
  callback: async (input) => {
    const result = await checkServiceHealth(input.service_name);
    return result.raw;
  },
});
