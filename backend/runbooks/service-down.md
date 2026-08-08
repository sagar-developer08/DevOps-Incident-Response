# Service Down Runbook

## Symptoms
- HTTP 503/502 errors from load balancer
- Health check failures
- Zero healthy targets in target group

## Diagnostic Steps
1. Check ECS/EC2 service status: running vs desired task count
2. Review CloudWatch logs for startup errors or crash loops
3. Check recent deployments (last 2 hours)
4. Verify security group and network connectivity

## Remediation
1. **Rollback deployment** if issue started after a recent deploy
2. **Restart tasks**: `aws ecs update-service --force-new-deployment`
3. **Scale up** if resource exhaustion: increase desired count temporarily
4. **Check dependencies**: database, cache, external APIs

## Escalation Criteria
- Service down > 15 minutes → HIGH
- Complete outage affecting all users → CRITICAL
