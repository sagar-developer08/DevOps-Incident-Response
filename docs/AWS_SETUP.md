# AWS Setup Guide (New Account)

Step-by-step setup for the DevOps Incident Response Agent on a new AWS account.

## Architecture (After Refactor)

```
React (5173) → Node.js + Strands Agent (3001) → AWS Bedrock / CloudWatch / SNS
```

Everything runs in **one Node.js backend** — no separate Python agent.

---

## Step 1: Install Tools

```bash
node --version    # Need 20+
aws --version
npm install -g @aws/agentcore   # optional, for CLI deploy
```

---

## Step 2: Configure AWS CLI

```bash
aws configure
# Access Key, Secret Key, region: us-east-1, format: json

aws sts get-caller-identity   # must work
```

---

## Step 3: Enable Bedrock Model Access

1. AWS Console → **Amazon Bedrock** → region **us-east-1**
2. **Model access** → Enable **Claude 3.5 Sonnet** (or Claude Sonnet 4)
3. Wait for **Access granted**

Test:
```bash
aws bedrock list-foundation-models --region us-east-1 \
  --query "modelSummaries[?contains(modelId,'claude')].modelId" --output table
```

---

## Step 4: Create AWS Resources for Tools

### CloudWatch Log Group
```bash
aws logs create-log-group --log-group-name /devops/incident-demo --region us-east-1

aws logs put-log-events --log-group-name /devops/incident-demo \
  --log-stream-name demo --log-events \
  timestamp=$(($(date +%s)*1000)),message="ERROR PaymentService timeout"
```

### SNS Topic (Escalation)
```bash
aws sns create-topic --name devops-incident-escalation --region us-east-1

aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:devops-incident-escalation \
  --protocol email --notification-endpoint your@email.com
```

---

## Step 5: Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v2:0
CLOUDWATCH_LOG_GROUP=/devops/incident-demo
SNS_ESCALATION_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT_ID:devops-incident-escalation
ECS_CLUSTER_NAME=          # optional
ECS_SERVICE_NAME=          # optional
```

---

## Step 6: Run Locally

**Terminal 1 — Backend:**
```bash
cd backend && npm install && npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm install && npm run dev
```

Open: http://localhost:5173

---

## Step 7: Deploy to AgentCore

```bash
cd backend

# Build Docker image (ARM64 required)
docker build --platform linux/arm64 -t devops-incident-agent .

# Push to ECR (see Strands TypeScript deploy docs)
# Create AgentCore runtime pointing to ECR image
```

Backend exposes required AgentCore endpoints:
- `GET /ping`
- `POST /invocations`

---

## IAM Permissions Needed

| Service | Permission |
|---------|------------|
| Bedrock | `bedrock:InvokeModel` |
| CloudWatch Logs | `logs:FilterLogEvents`, `logs:DescribeLogGroups` |
| CloudWatch | `cloudwatch:DescribeAlarms`, `cloudwatch:GetMetricStatistics` |
| ECS | `ecs:DescribeServices` (optional) |
| SNS | `sns:Publish` |

---

## Checklist

- [ ] `aws sts get-caller-identity` works
- [ ] Bedrock model access enabled
- [ ] CloudWatch log group created
- [ ] SNS topic created (optional for escalation)
- [ ] `backend/.env` configured
- [ ] `npm run dev` in backend works
- [ ] Frontend connects at localhost:5173
