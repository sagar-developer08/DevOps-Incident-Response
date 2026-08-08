# Order Service Runbook

## Symptoms
- Orders stuck in PENDING
- Fulfillment workflow failures
- SQS dead-letter queue messages

## Remediation
1. Replay messages from DLQ after fixing root cause
2. Restart fulfillment workers
3. Resolve inventory lock contention

## Escalation
- Fulfillment pipeline blocked → CRITICAL
