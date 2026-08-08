import { pushLogsToCloudWatch } from "./cloudwatchLogger.js";
import { getScenario, getActiveScenario, INCIDENT_SCENARIOS } from "./incidents.js";
import type { MockServiceState, ServiceName } from "./types.js";

const BASE: Record<ServiceName, Omit<MockServiceState, "requestCount" | "errorCount">> = {
  payment: {
    name: "payment",
    displayName: "Payment Service",
    description: "Processes checkout payments and refunds",
    status: "healthy",
    httpStatus: 200,
    latencyMs: 120,
    errorRate: 0.2,
    activeIncident: null,
    lastIncidentAt: null,
  },
  cart: {
    name: "cart",
    displayName: "Cart Service",
    description: "Manages shopping cart sessions and items",
    status: "healthy",
    httpStatus: 200,
    latencyMs: 85,
    errorRate: 0.1,
    activeIncident: null,
    lastIncidentAt: null,
  },
  order: {
    name: "order",
    displayName: "Order Service",
    description: "Creates and fulfills customer orders",
    status: "healthy",
    httpStatus: 200,
    latencyMs: 150,
    errorRate: 0.3,
    activeIncident: null,
    lastIncidentAt: null,
  },
};

const state: Record<ServiceName, MockServiceState> = {
  payment: { ...BASE.payment, requestCount: 1240, errorCount: 2 },
  cart: { ...BASE.cart, requestCount: 3420, errorCount: 3 },
  order: { ...BASE.order, requestCount: 890, errorCount: 1 },
};

export function getAllServices(): MockServiceState[] {
  return Object.values(state).map((s) => ({ ...s }));
}

export function getService(name: ServiceName): MockServiceState | undefined {
  const svc = state[name];
  return svc ? { ...svc } : undefined;
}

export function getServiceHealthReport(): string {
  const lines = ["Production Microservices Health:"];
  for (const svc of Object.values(state)) {
    const icon = svc.status === "healthy" ? "OK" : svc.status === "degraded" ? "DEGRADED" : "DOWN";
    lines.push(
      `  [${icon}] ${svc.displayName} (${svc.name}-service)`,
      `    Status: ${svc.status.toUpperCase()} | HTTP ${svc.httpStatus} | Latency ${svc.latencyMs}ms | Error rate ${svc.errorRate}%`,
      svc.activeIncident ? `    Active incident: ${svc.activeIncident}` : "    No active incident"
    );
  }
  return lines.join("\n");
}

export async function triggerIncident(serviceName: ServiceName, scenarioId: string) {
  const scenario = getScenario(serviceName, scenarioId);
  if (!scenario) throw new Error(`Unknown scenario '${scenarioId}'`);

  const svc = state[serviceName];
  svc.status = scenario.status;
  svc.httpStatus = scenario.httpStatus;
  svc.latencyMs = scenario.latencyMs;
  svc.errorRate = scenario.errorRate;
  svc.activeIncident = scenario.id;
  svc.lastIncidentAt = new Date().toISOString();
  svc.errorCount += Math.floor(scenario.errorRate / 10) + 1;

  const cloudwatch = await pushLogsToCloudWatch(serviceName, scenario.logMessages);
  return { service: { ...svc }, scenario, cloudwatch };
}

export function recoverService(serviceName: ServiceName): MockServiceState {
  const base = BASE[serviceName];
  const svc = state[serviceName];
  Object.assign(svc, {
    status: base.status,
    httpStatus: base.httpStatus,
    latencyMs: base.latencyMs,
    errorRate: base.errorRate,
    activeIncident: null,
  });
  return { ...svc };
}

export function listScenarios(serviceName: ServiceName) {
  return INCIDENT_SCENARIOS[serviceName] ?? [];
}

export { getActiveScenario, getScenario };
