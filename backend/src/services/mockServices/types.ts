export type ServiceStatus = "healthy" | "degraded" | "down";
export type ServiceName = "payment" | "cart" | "order";

export interface IncidentScenario {
  id: string;
  label: string;
  description: string;
  status: ServiceStatus;
  httpStatus: number;
  latencyMs: number;
  errorRate: number;
  logMessages: string[];
  runbookType: string;
  logSearchPattern: string;
  suggestedPrompt: string;
}

export interface MockServiceState {
  name: ServiceName;
  displayName: string;
  description: string;
  status: ServiceStatus;
  httpStatus: number;
  latencyMs: number;
  errorRate: number;
  activeIncident: string | null;
  lastIncidentAt: string | null;
  requestCount: number;
  errorCount: number;
}
