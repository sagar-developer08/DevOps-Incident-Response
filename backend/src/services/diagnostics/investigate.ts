import { config } from "../../config.js";
import { queryCloudWatchLogs } from "./cloudwatch.js";
import { lookupRunbook } from "./runbook.js";
import { checkServiceHealth } from "./health.js";
import {
  getService,
  getActiveScenario,
  listScenarios,
  getAllServices,
} from "../mockServices/registry.js";
import {
  getLatestEscalation,
  getEscalationsForService,
} from "../escalationStore.js";
import { TOOL_CATALOG } from "../../agent/toolMetadata.js";
import type { ServiceName, MockServiceState } from "../mockServices/types.js";

export interface InvestigationSnapshot {
  service: MockServiceState | null;
  scenario: ReturnType<typeof getActiveScenario> | null;
  tools: {
    cloudwatchLogs: Awaited<ReturnType<typeof queryCloudWatchLogs>>;
    serviceHealth: Awaited<ReturnType<typeof checkServiceHealth>>;
    runbook: ReturnType<typeof lookupRunbook>;
    sns: {
      configured: boolean;
      topicArn: string | null;
      lastEscalation: ReturnType<typeof getLatestEscalation>;
      history: ReturnType<typeof getEscalationsForService>;
      status: "not_sent" | "sent" | "not_configured";
      summary: string;
    };
  };
  toolCatalog: typeof TOOL_CATALOG;
  fetchedAt: string;
}

export async function investigateService(serviceName: ServiceName): Promise<InvestigationSnapshot> {
  const service = getService(serviceName);
  const scenario = getActiveScenario(serviceName, service?.activeIncident ?? null);

  const logPattern = scenario?.logSearchPattern ?? serviceName;
  const runbookType = scenario?.runbookType ?? `${serviceName}-service`;

  const [cloudwatchLogs, serviceHealth] = await Promise.all([
    queryCloudWatchLogs({ searchPattern: logPattern, hoursBack: 2, limit: 30 }),
    checkServiceHealth(serviceName),
  ]);

  const runbook = lookupRunbook(runbookType);
  const topicArn = config.snsEscalationTopicArn || null;
  const lastEscalation = getLatestEscalation(serviceName);
  const history = getEscalationsForService(serviceName);

  let snsStatus: InvestigationSnapshot["tools"]["sns"]["status"] = "not_configured";
  if (topicArn) {
    snsStatus = lastEscalation?.success ? "sent" : "not_sent";
  }

  return {
    service: service ?? null,
    scenario: scenario ?? null,
    tools: {
      cloudwatchLogs,
      serviceHealth,
      runbook,
      sns: {
        configured: Boolean(topicArn),
        topicArn,
        lastEscalation,
        history,
        status: snsStatus,
        summary: !topicArn
          ? "SNS topic not configured (SNS_ESCALATION_TOPIC_ARN missing)"
          : lastEscalation?.success
            ? `Escalated ${lastEscalation.severity} at ${lastEscalation.sentAt} — MessageId: ${lastEscalation.messageId}`
            : "No SNS escalation sent yet for this service",
      },
    },
    toolCatalog: TOOL_CATALOG,
    fetchedAt: new Date().toISOString(),
  };
}

export function formatInvestigationForAgent(snapshot: InvestigationSnapshot): string {
  const { service, scenario, tools } = snapshot;
  const lines = [
    `[UI Investigation Snapshot — ${service?.displayName ?? "unknown"}]`,
    `Fetched: ${snapshot.fetchedAt}`,
    scenario ? `Active scenario: ${scenario.label} (${scenario.id})` : "No active simulated incident",
    "",
    "=== CloudWatch Logs ===",
    tools.cloudwatchLogs.raw,
    "",
    "=== Service Health ===",
    tools.serviceHealth.raw,
    "",
    "=== Runbook ===",
    tools.runbook.raw.slice(0, 3000),
    "",
    "=== SNS Escalation ===",
    tools.sns.summary,
    tools.sns.lastEscalation
      ? `Last: ${tools.sns.lastEscalation.severity} — ${tools.sns.lastEscalation.detail}`
      : "Agent may escalate via escalate_incident tool if severity is HIGH/CRITICAL.",
  ];
  return lines.join("\n");
}

export { getAllServices, listScenarios };
