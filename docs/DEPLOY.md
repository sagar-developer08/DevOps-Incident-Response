# Complete AWS Deployment Guide

Step-by-step guide to deploy the **DevOps Incident Response Agent** to AWS.

| Component | AWS Service | Purpose |
|-----------|-------------|---------|
| Frontend (React UI) | **S3 + CloudFront** | Static app hosting (CDN) |
| Backend + Strands Agent | **AgentCore Runtime + ECR** | API, agent, tools |
| LLM | **Amazon Bedrock** | Agent reasoning |
| Logs | **CloudWatch Logs** | Real log queries |
| Escalation | **Amazon SNS** | Email alerts to on-call |

**Region:** `us-east-1` (N. Virginia) for everything.

> **Note:** CloudFront serves the React UI (static files). Live incident data comes from the **backend API** — the browser calls AgentCore after the page loads. This is normal production architecture.

---

## Architecture (after deploy)

```
User Browser
    │
    ├─► CloudFront ──► S3 (React build: index.html, JS, CSS)
    │
    └─► AgentCore Runtime URL ──► /api/chat, /api/services, /health, /ping
              │
              ├── Amazon Bedrock (LLM)
              ├── CloudWatch Logs
              └── SNS (escalation)
```

**Optional:** Configure CloudFront to proxy `/api/*` and `/health` to AgentCore so everything uses one domain (see [Phase 6](#phase-6-optional-one-domain-via-cloudfront)).

---

## Prerequisites

On your Mac:

```bash
node --version    # 20+
docker --version  # Docker Desktop running
aws --version     # AWS CLI v2
```

AWS CLI must work:

```bash
aws configure set region us-east-1
aws sts get-caller-identity
```

Note your **Account ID** from the output (example: `148761674610`).

---

## Phase 1 — Run locally first

Verify everything works before deploying.

### 1.1 Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=3001
AWS_REGION=us-east-1
CORS_ORIGIN=http://localhost:5173

# Pick ONE model (enable in Bedrock first):
BEDROCK_MODEL_ID=amazon.nova-pro-v1:0
# OR
# BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0

CLOUDWATCH_LOG_GROUP=/devops/incident-demo
SNS_ESCALATION_TOPIC_ARN=arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:devops-incident-escalation
```

```bash
npm run dev
# → http://localhost:3001
```

### 1.2 Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 1.3 Local smoke test

1. Open http://localhost:5173
2. Trigger **Payment → 503 Service Unavailable**
3. Center panel: check **CloudWatch Logs**, **Health**, **Runbook**, **SNS** tabs
4. Click **Report to Agent** → wait for response
5. Refresh SNS tab → check escalation status

```bash
curl http://localhost:3001/health
# Expect: "snsConfigured": true, "status": "healthy"
```

---

## Phase 2 — Create AWS resources

### 2.1 Enable Bedrock model access

**Console:**

1. Search **Amazon Bedrock** → region **US East (N. Virginia)**
2. Left menu → **Model access** (or **Get started**)
3. Enable **Amazon Nova Pro** and/or **Claude Sonnet 4.5**
4. Wait for status **Access granted**

**CLI test:**

```bash
aws bedrock list-foundation-models --region us-east-1 \
  --query "modelSummaries[?contains(modelId,'nova') || contains(modelId,'claude')].modelId" \
  --output table
```

### 2.2 CloudWatch Log Group

**Console:**

1. **CloudWatch** → **Log groups** → **Create log group**
2. Name: `/devops/incident-demo`
3. Create

**CLI:**

```bash
aws logs create-log-group \
  --log-group-name /devops/incident-demo \
  --region us-east-1
```

### 2.3 SNS topic (escalation emails)

**Console:**

1. **SNS** → **Topics** → **Create topic**
2. Type: **Standard**
3. Name: `devops-incident-escalation`
4. Copy **Topic ARN**: `arn:aws:sns:us-east-1:ACCOUNT_ID:devops-incident-escalation`
5. **Create subscription** → Protocol: **Email** → your email
6. **Confirm subscription** in your inbox (required for email delivery)

**CLI:**

```bash
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws sns create-topic --name devops-incident-escalation --region us-east-1

aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:${ACCOUNT_ID}:devops-incident-escalation \
  --protocol email \
  --notification-endpoint YOUR_EMAIL@gmail.com \
  --region us-east-1
```

**Test SNS:**

```bash
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:${ACCOUNT_ID}:devops-incident-escalation \
  --subject "Test escalation" \
  --message "SNS is working" \
  --region us-east-1
```

### 2.4 (Optional) CloudWatch alarm for demo

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name devops-demo-high-error-rate \
  --metric-name ErrorCount \
  --namespace DevOps/Demo \
  --statistic Sum --period 300 --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --region us-east-1

aws cloudwatch put-metric-data \
  --namespace DevOps/Demo \
  --metric-data MetricName=ErrorCount,Value=5,Unit=Count \
  --region us-east-1
```

Update `backend/.env` with your SNS ARN before continuing.

---

## Phase 3 — Push backend Docker image to ECR

AgentCore requires a **linux/arm64** container image.

### 3.1 Create ECR repository

**Console:**

1. **ECR** → **Repositories** → **Create repository**
2. Name: `devops-incident-agent`
3. Create → copy **URI**

**CLI:**

```bash
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1
export ECR_REPO=devops-incident-agent

aws ecr create-repository \
  --repository-name ${ECR_REPO} \
  --region ${AWS_REGION}
```

### 3.2 Build and push

```bash
cd backend

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin \
  ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build ARM64 image (required for AgentCore)
docker build --platform linux/arm64 -t ${ECR_REPO} .

# Tag and push
docker tag ${ECR_REPO}:latest \
  ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest

docker push \
  ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest
```

### 3.3 Verify in Console

**ECR** → `devops-incident-agent` → image tag `latest` should appear.

---

## Phase 4 — Deploy backend on AgentCore Runtime

### 4.1 IAM role for AgentCore

**Console (easiest):**

When creating the runtime, choose **Create and use a new service role**.

**Or create manually:**

1. **IAM** → **Roles** → **Create role**
2. Trusted entity: **AWS service** → **Bedrock AgentCore** (or custom trust for `bedrock-agentcore.amazonaws.com`)
3. Attach policies:
   - `AmazonBedrockFullAccess`
   - `CloudWatchLogsFullAccess`
   - `CloudWatchFullAccess`
   - `AmazonSNSFullAccess`
4. Role name: `BedrockAgentCoreRuntimeRole`
5. Add inline ECR read policy for your repository

### 4.2 Create AgentCore Runtime

**Console:**

1. **Amazon Bedrock** → **AgentCore** → **Runtimes**
2. **Create runtime**
3. Fill in:

| Field | Value |
|-------|--------|
| Runtime name | `devops-incident-agent` |
| Artifact type | **Container** |
| Container URI | `ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/devops-incident-agent:latest` |
| Port | `8080` |
| Network | **Public** |
| Protocol | **HTTP** |
| IAM role | `BedrockAgentCoreRuntimeRole` (or auto-create) |

4. **Environment variables:**

| Key | Value |
|-----|--------|
| `PORT` | `8080` |
| `AWS_REGION` | `us-east-1` |
| `BEDROCK_MODEL_ID` | `amazon.nova-pro-v1:0` (or your Claude model ID) |
| `CLOUDWATCH_LOG_GROUP` | `/devops/incident-demo` |
| `SNS_ESCALATION_TOPIC_ARN` | `arn:aws:sns:us-east-1:ACCOUNT_ID:devops-incident-escalation` |
| `CORS_ORIGIN` | `*` initially, then your CloudFront URL |

5. **Create** → wait until status is **Active** (2–5 min)
6. Copy the **Runtime endpoint URL** (example: `https://xxxxx.us-east-1.bedrock-agentcore.amazonaws.com`)

**CLI alternative:**

```bash
aws bedrock-agentcore-control create-agent-runtime \
  --agent-runtime-name devops_incident_agent \
  --agent-runtime-artifact containerConfiguration={containerUri=${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest} \
  --role-arn arn:aws:iam::${ACCOUNT_ID}:role/BedrockAgentCoreRuntimeRole \
  --network-configuration networkMode=PUBLIC \
  --protocol-configuration serverProtocol=HTTP \
  --region ${AWS_REGION}
```

### 4.3 Test backend endpoints

Replace `RUNTIME_URL` with your endpoint:

```bash
export RUNTIME_URL=https://YOUR-RUNTIME-URL

curl ${RUNTIME_URL}/health
curl ${RUNTIME_URL}/ping
curl ${RUNTIME_URL}/api/services
```

Expected:

- `/health` → `"status":"healthy"`, `"snsConfigured":true`
- `/ping` → AgentCore health contract
- `/api/services` → payment, cart, order services JSON

---

## Phase 5 — Deploy frontend (S3 + CloudFront)

### 5.1 Build React app with backend URL

```bash
cd frontend

# Point API to AgentCore runtime (NO trailing slash)
echo "VITE_API_URL=https://YOUR-RUNTIME-URL" > .env.production

npm run build
# Output: frontend/dist/
```

### 5.2 Create S3 bucket

**Console:**

1. **S3** → **Create bucket**
2. Name: `devops-incident-ui-ACCOUNT_ID` (globally unique)
3. Region: **us-east-1**
4. **Block all public access** → ON (CloudFront will access via OAC)
5. Create

### 5.3 Upload build files

**Console:**

1. Open bucket → **Upload**
2. Upload **all files** inside `frontend/dist/`:
   - `index.html`
   - `assets/` folder
   - `deploy-guide.html` (if present in public/)

**CLI:**

```bash
aws s3 sync frontend/dist/ s3://devops-incident-ui-${ACCOUNT_ID}/ --delete
```

### 5.4 Create CloudFront distribution

**Console:**

1. **CloudFront** → **Create distribution**
2. **Origin domain:** select your S3 bucket
3. **Origin access:** **Origin access control (OAC)** → Create OAC
4. Copy the bucket policy → paste in S3 bucket **Permissions**
5. **Default root object:** `index.html`
6. **Viewer protocol policy:** Redirect HTTP to HTTPS
7. **Create distribution**
8. Wait ~5–10 min until **Enabled**
9. Copy domain: `https://dxxxxxxxx.cloudfront.net`

### 5.5 SPA routing (required for React)

**CloudFront** → your distribution → **Error pages**:

| HTTP code | Response path | Response code |
|-----------|---------------|---------------|
| 403 | `/index.html` | 200 |
| 404 | `/index.html` | 200 |

### 5.6 Update backend CORS

In **AgentCore Runtime** → Edit environment variables:

```
CORS_ORIGIN=https://dxxxxxxxx.cloudfront.net
```

Redeploy / save runtime config.

### 5.7 Re-upload frontend after URL changes

If you change `VITE_API_URL`, rebuild and re-sync to S3:

```bash
cd frontend && npm run build
aws s3 sync dist/ s3://devops-incident-ui-${ACCOUNT_ID}/ --delete
```

Invalidate CloudFront cache (optional, for faster updates):

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

---

## Phase 6 — (Optional) One domain via CloudFront

Use one URL for UI + API (CloudFront proxies API to AgentCore).

**CloudFront** → Distribution → **Origins** → **Create origin**:

| Field | Value |
|-------|--------|
| Origin domain | Your AgentCore runtime host (no `https://`) |
| Protocol | HTTPS only |
| Origin path | (empty) |

**Behaviors** → Create behavior:

| Path pattern | Origin |
|--------------|--------|
| `/api/*` | AgentCore origin |
| `/health` | AgentCore origin |
| `/ping` | AgentCore origin |
| Default `*` | S3 origin |

Rebuild frontend with empty API base (same domain):

```bash
echo "VITE_API_URL=" > frontend/.env.production
npm run build
```

Upload to S3 again. Browser calls `/api/chat` on CloudFront → forwarded to AgentCore.

---

## Phase 7 — Production verification checklist

### Infrastructure

- [ ] `aws sts get-caller-identity` works
- [ ] Bedrock model access granted
- [ ] CloudWatch log group `/devops/incident-demo` exists
- [ ] SNS topic exists + email subscription **Confirmed**
- [ ] ECR image `latest` pushed (arm64)
- [ ] AgentCore runtime **Active**
- [ ] CloudFront distribution **Enabled**

### Endpoint tests

```bash
# Backend
curl https://RUNTIME_URL/health
curl https://RUNTIME_URL/ping

# Frontend
open https://YOUR-CLOUDFRONT-URL
```

### Application flow (live demo)

- [ ] Open CloudFront URL in browser
- [ ] Header shows **healthy**
- [ ] Trigger **Payment → 503**
- [ ] Investigation panel shows **CloudWatch logs**
- [ ] **Runbook** tab shows payment-failure content
- [ ] **SNS** tab shows topic configured
- [ ] **Report to Agent** → agent responds with markdown analysis
- [ ] Refresh SNS tab → **Escalation sent: Yes** (if agent escalated)
- [ ] Check email for SNS notification

### AgentCore contract (assessment requirement)

- [ ] `GET /ping` returns healthy
- [ ] `POST /invocations` accepts prompt (optional manual test)

```bash
curl -X POST https://RUNTIME_URL/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Payment API 503 in production. Triage briefly."}'
```

---

## Environment variables reference

### Backend (`backend/.env` local / AgentCore runtime env in prod)

| Variable | Required | Example |
|----------|----------|---------|
| `PORT` | Yes | `3001` local / `8080` prod |
| `AWS_REGION` | Yes | `us-east-1` |
| `BEDROCK_MODEL_ID` | Yes | `amazon.nova-pro-v1:0` |
| `CLOUDWATCH_LOG_GROUP` | Yes | `/devops/incident-demo` |
| `SNS_ESCALATION_TOPIC_ARN` | Yes | `arn:aws:sns:us-east-1:...` |
| `CORS_ORIGIN` | Yes | `http://localhost:5173` or CloudFront URL |
| `ECS_CLUSTER_NAME` | No | optional |
| `ECS_SERVICE_NAME` | No | optional |

### Frontend (`frontend/.env.production`)

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_API_URL` | Yes* | `https://RUNTIME-URL` or empty if using CloudFront proxy |

\*Empty string = same origin (when CloudFront proxies `/api`).

---

## Updating after code changes

### Backend change

```bash
cd backend
docker build --platform linux/arm64 -t devops-incident-agent .
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/devops-incident-agent:latest
# Update AgentCore runtime to pull new image (or force new deployment in console)
```

### Frontend change

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://devops-incident-ui-ACCOUNT_ID/ --delete
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| SNS tab: "not configured" | Set `SNS_ESCALATION_TOPIC_ARN` in `.env` / AgentCore env → **restart backend** |
| SNS email not received | Confirm subscription in inbox; run `aws sns publish` test |
| CORS error in browser | Set `CORS_ORIGIN` to exact CloudFront URL (no trailing `/`) |
| Frontend calls localhost | Rebuild with `VITE_API_URL` in `.env.production` |
| Agent timeout | Normal — 30–90s with tools; wait for response |
| Docker build fails on Intel Mac | Always use `--platform linux/arm64` |
| CloudFront shows old UI | Run cache invalidation `/*` |
| `<thinking>` in chat | Update to latest code (sanitizer strips it) |
| Bedrock AccessDenied | Enable model in Bedrock → Model access |
| Logs empty in UI | Trigger incident first (pushes logs); then Refresh |

---

## What to submit (assessment)

1. **GitHub repo** with source code
2. **README** + link to this file (`docs/DEPLOY.md`)
3. **Architecture diagram** (`docs/architecture.md`)
4. **Live URLs** (optional but impressive):
   - CloudFront: `https://xxx.cloudfront.net`
   - AgentCore: `https://xxx.bedrock-agentcore...`
5. Mention **Cursor AI** usage in README

---

## Quick command reference

```bash
# Account
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

# ECR push
cd backend && docker build --platform linux/arm64 -t devops-incident-agent .
docker tag devops-incident-agent:latest ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/devops-incident-agent:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/devops-incident-agent:latest

# Frontend build
cd frontend && echo "VITE_API_URL=https://RUNTIME-URL" > .env.production && npm run build

# S3 upload
aws s3 sync frontend/dist/ s3://devops-incident-ui-${ACCOUNT_ID}/ --delete
```

---

**Also available:** Browser version at http://localhost:5173/deploy-guide.html (same content, shorter format).
