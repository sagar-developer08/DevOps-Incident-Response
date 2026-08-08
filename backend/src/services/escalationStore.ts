export interface EscalationRecord {
  serviceName: string;
  severity: string;
  summary: string;
  messageId: string | null;
  topicArn: string;
  sentAt: string;
  success: boolean;
  detail: string;
}

const records: EscalationRecord[] = [];

export function recordEscalation(record: EscalationRecord): void {
  records.unshift(record);
  if (records.length > 50) records.pop();
}

export function getEscalationsForService(serviceName: string): EscalationRecord[] {
  return records.filter((r) => r.serviceName === serviceName);
}

export function getLatestEscalation(serviceName: string): EscalationRecord | null {
  return getEscalationsForService(serviceName)[0] ?? null;
}

export function getAllEscalations(): EscalationRecord[] {
  return [...records];
}
