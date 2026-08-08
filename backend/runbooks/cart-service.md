# Cart Service Runbook

## Symptoms
- High latency on add-to-cart
- Redis cache miss storms
- Cart sync failures with inventory-service

## Remediation
1. Warm Redis cache; scale cart replicas
2. Check inventory-service dependency
3. Enable degraded read-only cart mode if needed

## Escalation
- Cart data loss → HIGH
