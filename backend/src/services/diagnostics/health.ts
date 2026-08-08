import {
  CloudWatchClient,
  DescribeAlarmsCommand,
} from "@aws-sdk/client-cloudwatch";
import { config } from "../../config.js";
import { getService, getServiceHealthReport } from "../mockServices/registry.js";
import type { ServiceName } from "../mockServices/types.js";

const cwClient = new CloudWatchClient({ region: config.awsRegion });

export interface ServiceHealthResult {
  success: boolean;
  serviceName: string;
  status: string;
  metrics: Record<string, string | number>;
  alarms: string[];
  raw: string;
}

export async function checkServiceHealth(serviceName?: string): Promise<ServiceHealthResult> {
  const mockReport = getServiceHealthReport();
  const alarms: string[] = [];

  try {
    const alarmResponse = await cwClient.send(
      new DescribeAlarmsCommand({ StateValue: "ALARM", MaxRecords: 10 })
    );
    for (const alarm of alarmResponse.MetricAlarms ?? []) {
      alarms.push(`${alarm.AlarmName}: ${(alarm.StateReason ?? "").slice(0, 120)}`);
    }
  } catch {
    alarms.push("Could not fetch CloudWatch alarms");
  }

  const svc = serviceName ? getService(serviceName as ServiceName) : undefined;
  const raw = [
    mockReport,
    alarms.length > 0
      ? `\nCloudWatch Alarms in ALARM (${alarms.length}):\n${alarms.map((a) => `  - ${a}`).join("\n")}`
      : "\nNo CloudWatch alarms currently in ALARM state.",
  ].join("\n");

  return {
    success: true,
    serviceName: serviceName ?? "all",
    status: svc?.status ?? "unknown",
    metrics: svc
      ? {
          httpStatus: svc.httpStatus,
          latencyMs: svc.latencyMs,
          errorRate: svc.errorRate,
          activeIncident: svc.activeIncident ?? "none",
        }
      : {},
    alarms,
    raw,
  };
}
