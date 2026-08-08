import { queryCloudWatchLogs } from "../../services/diagnostics/cloudwatch.js";
import { tool } from "@strands-agents/sdk";
import { z } from "zod";

export const queryCloudwatchLogsTool = tool({
  name: "query_cloudwatch_logs",
  description:
    "Query CloudWatch Logs for error patterns related to an incident. Use when investigating application errors, timeouts, or exceptions.",
  inputSchema: z.object({
    log_group: z.string().optional().describe("CloudWatch log group name."),
    search_pattern: z.string().default("ERROR").describe("Filter pattern (e.g. ERROR, PaymentService)."),
    hours_back: z.number().min(1).max(24).default(1),
    limit: z.number().min(1).max(50).default(20),
  }),
  callback: async (input) => {
    const result = await queryCloudWatchLogs({
      logGroup: input.log_group,
      searchPattern: input.search_pattern,
      hoursBack: input.hours_back,
      limit: input.limit,
    });
    return result.raw;
  },
});
