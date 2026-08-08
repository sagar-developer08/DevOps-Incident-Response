# High CPU Runbook

## Symptoms
- CloudWatch CPUUtilization > 80% sustained
- Slow response times
- Auto-scaling triggered repeatedly

## Diagnostic Steps
1. Check CPU metrics in CloudWatch (last 1-4 hours)
2. Identify top processes via container insights
3. Review traffic patterns — spike vs gradual increase
4. Check for infinite loops or runaway background jobs in logs

## Remediation
1. **Scale horizontally**: increase ECS desired count or EC2 instances
2. **Identify hot endpoint**: check ALB access logs for traffic patterns
3. **Kill runaway process** if identified in logs
4. **Enable rate limiting** if traffic spike / potential DDoS

## Escalation Criteria
- CPU > 95% for 10+ minutes with user impact → HIGH
- Service becoming unresponsive → CRITICAL
