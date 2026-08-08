# Payment Failure Runbook

## Symptoms
- HTTP 503/500 on `/api/payment/charge`
- Circuit breaker open on payment gateway
- DB connection pool exhaustion

## Remediation
1. Restart payment-service tasks (force new deployment)
2. Increase DB connection pool size temporarily
3. Check payment gateway upstream status
4. Rollback if issue started after deploy

## Escalation
- Checkout fully blocked > 10 minutes → HIGH
