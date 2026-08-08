import type { IncidentScenario, ServiceName } from "./types.js";

export const INCIDENT_SCENARIOS: Record<ServiceName, IncidentScenario[]> = {
  payment: [
    {
      id: "payment-outage",
      label: "503 Service Unavailable",
      description: "Payment gateway returning 503 errors",
      status: "down",
      httpStatus: 503,
      latencyMs: 1200,
      errorRate: 98,
      logMessages: [
        "ERROR PaymentService - upstream gateway timeout after 30000ms",
        "ERROR PaymentService - HTTP 503 Service Unavailable on /charge",
        "ERROR PaymentService - circuit breaker OPEN for payment-gateway",
      ],
      runbookType: "payment-failure",
      logSearchPattern: "PaymentService",
      suggestedPrompt:
        "Payment API returning 503 errors in production. Users cannot complete checkout. DB connection pool may be exhausted.",
    },
    {
      id: "payment-db-timeout",
      label: "DB Connection Timeout",
      description: "Database connection pool exhausted",
      status: "degraded",
      httpStatus: 500,
      latencyMs: 850,
      errorRate: 45,
      logMessages: [
        "ERROR PaymentService - connection pool exhausted (max=20, active=20)",
        "ERROR PaymentService - timeout acquiring DB connection after 5000ms",
        "WARN PaymentService - retry attempt 3/3 for transaction tx_88421",
      ],
      runbookType: "database-connection",
      logSearchPattern: "PaymentService",
      suggestedPrompt:
        "Payment service experiencing database connection timeouts. Partial checkout failures in production.",
    },
  ],
  cart: [
    {
      id: "cart-high-latency",
      label: "High Latency",
      description: "Cart API response times degraded",
      status: "degraded",
      httpStatus: 200,
      latencyMs: 3200,
      errorRate: 12,
      logMessages: [
        "WARN CartService - p99 latency 3200ms exceeds threshold 500ms",
        "ERROR CartService - Redis cache miss storm on cart:session:* keys",
        "WARN CartService - slow query getCartItems took 2800ms",
      ],
      runbookType: "high-cpu",
      logSearchPattern: "CartService",
      suggestedPrompt:
        "Cart service showing high latency in production. Add-to-cart taking 3+ seconds for users.",
    },
    {
      id: "cart-sync-failure",
      label: "Cart Sync Failure",
      description: "Cart items not syncing across sessions",
      status: "down",
      httpStatus: 502,
      latencyMs: 500,
      errorRate: 75,
      logMessages: [
        "ERROR CartService - failed to sync cart state with inventory-service",
        "ERROR CartService - HTTP 502 Bad Gateway from inventory-service",
        "ERROR CartService - cart item count mismatch user_id=usr_9921 expected=3 actual=0",
      ],
      runbookType: "cart-service",
      logSearchPattern: "CartService",
      suggestedPrompt:
        "Cart service failing to sync items. Users report empty cart after adding products.",
    },
  ],
  order: [
    {
      id: "order-fulfillment-failure",
      label: "Fulfillment Failure",
      description: "Orders stuck in pending state",
      status: "down",
      httpStatus: 500,
      latencyMs: 900,
      errorRate: 80,
      logMessages: [
        "ERROR OrderService - fulfillment workflow failed for order ord_7732",
        "ERROR OrderService - SQS dead-letter queue received message from order-fulfillment",
        "ERROR OrderService - order status stuck PENDING for 15+ minutes",
      ],
      runbookType: "order-service",
      logSearchPattern: "OrderService",
      suggestedPrompt:
        "Order service failing to fulfill orders. Multiple orders stuck in PENDING status in production.",
    },
    {
      id: "order-inventory-lock",
      label: "Inventory Lock",
      description: "Inventory lock contention causing order failures",
      status: "degraded",
      httpStatus: 409,
      latencyMs: 650,
      errorRate: 35,
      logMessages: [
        "ERROR OrderService - inventory lock timeout for sku_PRD_4421",
        "WARN OrderService - concurrent order conflict on product sku_PRD_4421",
        "ERROR OrderService - rollback transaction for order ord_9901 due to lock failure",
      ],
      runbookType: "database-connection",
      logSearchPattern: "OrderService",
      suggestedPrompt:
        "Order service returning 409 conflicts. Inventory lock timeouts during peak traffic.",
    },
  ],
};

export function getScenario(service: ServiceName, scenarioId: string): IncidentScenario | undefined {
  return INCIDENT_SCENARIOS[service]?.find((s) => s.id === scenarioId);
}

export function getActiveScenario(
  service: ServiceName,
  activeIncidentId: string | null
): IncidentScenario | undefined {
  if (!activeIncidentId) return undefined;
  return getScenario(service, activeIncidentId);
}
