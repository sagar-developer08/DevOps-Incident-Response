import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import { config } from "../../config.js";
import { recordEscalation } from "../../services/escalationStore.js";

const snsClient = new SNSClient({ region: config.awsRegion });

export const escalateIncidentTool = tool({
  name: "escalate_incident",
  description:
    "Escalate a production incident to on-call via SNS. Only use for HIGH or CRITICAL severity after gathering evidence.",
  inputSchema: z.object({
    severity: z.string().describe("Severity: HIGH or CRITICAL only."),
    summary: z.string().describe("Brief description of incident and current impact."),
    service_name: z.string().default("unknown").describe("Affected service name."),
    recommended_action: z.string().optional(),
  }),
  callback: async (input) => {
    const severity = input.severity.toUpperCase().trim();
    const serviceName = input.service_name || "unknown";

    if (!["HIGH", "CRITICAL"].includes(severity)) {
      return `Escalation not triggered: severity '${input.severity}' is below threshold.`;
    }
    if (!input.summary || input.summary.trim().length < 10) {
      return "ERROR: summary required (min 10 characters) for escalation.";
    }

    const topicArn = config.snsEscalationTopicArn;
    if (!topicArn) {
      recordEscalation({
        serviceName,
        severity,
        summary: input.summary,
        messageId: null,
        topicArn: "",
        sentAt: new Date().toISOString(),
        success: false,
        detail: "SNS_ESCALATION_TOPIC_ARN not configured",
      });
      return `ERROR: SNS_ESCALATION_TOPIC_ARN not configured. Escalation captured but NOT sent.`;
    }

    const timestamp = new Date().toISOString();
    const action = input.recommended_action?.trim() || "See incident chat for full triage details.";
    const subject = `[${severity}] Incident: ${serviceName} — ${input.summary.slice(0, 80)}`;
    const message = [
      `INCIDENT ESCALATION — ${severity}`,
      "",
      `Service: ${serviceName}`,
      `Time: ${timestamp}`,
      "",
      "Summary:",
      input.summary.trim(),
      "",
      "Recommended Action:",
      action,
      "",
      "Source: devops-incident-response-agent",
    ].join("\n");

    try {
      const response = await snsClient.send(
        new PublishCommand({
          TopicArn: topicArn,
          Subject: subject.slice(0, 100),
          Message: message,
        })
      );

      recordEscalation({
        serviceName,
        severity,
        summary: input.summary,
        messageId: response.MessageId ?? null,
        topicArn,
        sentAt: timestamp,
        success: true,
        detail: `Published to ${topicArn}`,
      });

      return (
        `Incident escalated successfully.\n` +
        `  Severity: ${severity}\n` +
        `  Service: ${serviceName}\n` +
        `  SNS MessageId: ${response.MessageId ?? "unknown"}\n` +
        `  Topic: ${topicArn}`
      );
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      recordEscalation({
        serviceName,
        severity,
        summary: input.summary,
        messageId: null,
        topicArn,
        sentAt: timestamp,
        success: false,
        detail,
      });
      return `ERROR: SNS publish failed: ${detail}`;
    }
  },
});
