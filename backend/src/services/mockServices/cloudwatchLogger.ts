import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
  PutLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { config } from "../../config.js";

const client = new CloudWatchLogsClient({ region: config.awsRegion });
const streamTokens = new Map<string, string>();

async function ensureStream(logStreamName: string): Promise<string | undefined> {
  const logGroup = config.cloudwatchLogGroup;
  try {
    const existing = await client.send(
      new DescribeLogStreamsCommand({
        logGroupName: logGroup,
        logStreamNamePrefix: logStreamName,
        limit: 1,
      })
    );
    const stream = existing.logStreams?.find((s) => s.logStreamName === logStreamName);
    if (stream?.uploadSequenceToken) {
      streamTokens.set(logStreamName, stream.uploadSequenceToken);
      return stream.uploadSequenceToken;
    }
    await client.send(
      new CreateLogStreamCommand({ logGroupName: logGroup, logStreamName })
    );
    return undefined;
  } catch {
    return undefined;
  }
}

export async function pushLogsToCloudWatch(
  serviceName: string,
  messages: string[]
): Promise<{ success: boolean; detail: string }> {
  const logStreamName = `${serviceName}-incidents`;
  const logGroup = config.cloudwatchLogGroup;
  if (!logGroup) {
    return { success: false, detail: "CLOUDWATCH_LOG_GROUP not configured" };
  }

  let sequenceToken = streamTokens.get(logStreamName);
  if (!sequenceToken) {
    sequenceToken = (await ensureStream(logStreamName)) ?? undefined;
  }

  const baseTime = Date.now();
  const events = messages.map((message, i) => ({
    timestamp: baseTime + i * 100,
    message: `[${serviceName}-service] ${message}`,
  }));

  try {
    const response = await client.send(
      new PutLogEventsCommand({
        logGroupName: logGroup,
        logStreamName,
        logEvents: events,
        sequenceToken,
      })
    );
    if (response.nextSequenceToken) {
      streamTokens.set(logStreamName, response.nextSequenceToken);
    }
    return {
      success: true,
      detail: `Pushed ${events.length} event(s) to ${logGroup}/${logStreamName}`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("InvalidSequenceToken") || message.includes("DataAlreadyAccepted")) {
      streamTokens.delete(logStreamName);
      return pushLogsToCloudWatch(serviceName, messages);
    }
    return { success: false, detail: message };
  }
}
