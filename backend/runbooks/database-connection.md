# Database Connection Failure Runbook

## Symptoms
- `Connection refused`, `timeout`, `too many connections` in logs
- Application errors on data-dependent endpoints
- RDS CloudWatch `DatabaseConnections` at max

## Diagnostic Steps
1. Query logs for database connection errors (pattern: `timeout`, `connection refused`, `pool exhausted`)
2. Check RDS instance status in AWS Console
3. Review `DatabaseConnections` and `CPUUtilization` metrics
4. Verify security group allows traffic from application subnet

## Remediation
1. **Connection pool**: reduce max connections or increase pool timeout in app config
2. **RDS scaling**: increase instance size if CPU/memory saturated
3. **Kill idle connections**: review long-running queries
4. **Failover**: if Multi-AZ, check if failover occurred automatically

## Escalation Criteria
- Data layer completely unreachable → CRITICAL
- Intermittent connection failures affecting checkout/payments → HIGH
