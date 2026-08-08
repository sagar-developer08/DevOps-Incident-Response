export interface ToolDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  awsService: string;
  icon: string;
}

export const TOOL_CATALOG: ToolDefinition[] = [
  {
    id: "query_cloudwatch_logs",
    name: "query_cloudwatch_logs",
    displayName: "CloudWatch Logs",
    description: "Search production logs for errors, timeouts, and stack traces",
    awsService: "Amazon CloudWatch Logs",
    icon: "logs",
  },
  {
    id: "check_service_health",
    name: "check_service_health",
    displayName: "Service Health",
    description: "Check ECS tasks, CloudWatch alarms, and service metrics",
    awsService: "ECS + CloudWatch",
    icon: "health",
  },
  {
    id: "lookup_runbook",
    name: "lookup_runbook",
    displayName: "Runbook Lookup",
    description: "Find standard remediation steps for known incident types",
    awsService: "Local runbooks (markdown)",
    icon: "runbook",
  },
  {
    id: "escalate_incident",
    name: "escalate_incident",
    displayName: "SNS Escalation",
    description: "Notify on-call engineers via SNS for HIGH/CRITICAL incidents",
    awsService: "Amazon SNS",
    icon: "escalate",
  },
];

export function getToolDisplayName(toolName: string): string {
  return TOOL_CATALOG.find((t) => t.name === toolName)?.displayName ?? toolName;
}
