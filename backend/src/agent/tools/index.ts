import { queryCloudwatchLogsTool } from "./cloudwatchLogs.js";
import { checkServiceHealthTool } from "./serviceHealth.js";
import { lookupRunbookTool } from "./runbook.js";
import { escalateIncidentTool } from "./escalation.js";

export const allTools = [
  queryCloudwatchLogsTool,
  checkServiceHealthTool,
  lookupRunbookTool,
  escalateIncidentTool,
];
