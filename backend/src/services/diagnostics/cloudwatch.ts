import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { config } from "../../config.js";

const logsClient = new CloudWatchLogsClient({ region: config.awsRegion });

export interface LogEvent {
  timestamp: string;
  message: string;
}

export interface CloudWatchQueryResult {
  success: boolean;
  logGroup: string;
  searchPattern: string;
  eventCount: number;
  events: LogEvent[];
  summary: string;
  raw: string;
}

export async function queryCloudWatchLogs(options: {
  logGroup?: string;
  searchPattern?: string;
  hoursBack?: number;
  limit?: number;
}): Promise<CloudWatchQueryResult> {
  const logGroup = options.logGroup || config.cloudwatchLogGroup;
  const searchPattern = options.searchPattern || "ERROR";
  const hoursBack = options.hoursBack ?? 2;
  const limit = options.limit ?? 25;

  if (!logGroup) {
    return {
      success: false,
      logGroup: "",
      searchPattern,
      eventCount: 0,
      events: [],
      summary: "CLOUDWATCH_LOG_GROUP not configured",
      raw: "ERROR: No log group configured.",
    };
  }

  const endTime = Date.now();
  const startTime = endTime - hoursBack * 60 * 60 * 1000;

  try {
    const response = await logsClient.send(
      new FilterLogEventsCommand({
        logGroupName: logGroup,
        startTime,
        endTime,
        filterPattern: searchPattern,
        limit,
      })
    );

    const events: LogEvent[] = (response.events ?? []).map((e) => ({
      timestamp: new Date(e.timestamp ?? 0).toISOString(),
      message: (e.message ?? "").trim(),
    }));

    const raw =
      events.length === 0
        ? `No log events matching '${searchPattern}' in '${logGroup}' within last ${hoursBack}h.`
        : `Found ${events.length} event(s) in '${logGroup}' (pattern: '${searchPattern}'):\n` +
          events.map((e) => `[${e.timestamp}] ${e.message}`).join("\n");

    return {
      success: true,
      logGroup,
      searchPattern,
      eventCount: events.length,
      events,
      summary:
        events.length === 0
          ? `No logs found for pattern "${searchPattern}"`
          : `${events.length} log event(s) found`,
      raw,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      logGroup,
      searchPattern,
      eventCount: 0,
      events: [],
      summary: `Query failed: ${message}`,
      raw: `ERROR: CloudWatch query failed: ${message}`,
    };
  }
}
