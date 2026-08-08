# DevOps Incident Response Agent

AI-powered incident triage for DevOps/SRE engineers. Built for the **AWS AgentCore + Strands** take-home assessment using **Strands Agents (TypeScript)**, **Amazon Bedrock**, **AgentCore Runtime**, **Node.js**, and **React**.

---

## Live Demo

| Resource | URL |
|----------|-----|
| **Web App** | https://dj5efjm4yxqlb.cloudfront.net |
| **Backend API** | https://mgfxskvu6f.us-east-1.awsapprunner.com |
| **AgentCore Runtime** | `devops_incident_agent` (us-east-1) |

**Demo login**

| Field | Value |
|-------|--------|
| User ID | `sagar-test` |
| Password | `Sagar@123` |

### Quick demo flow

1. Sign in at the CloudFront URL above.
2. Trigger an incident on **Payment**, **Cart**, or **Order**.
3. Review **CloudWatch Logs**, **Health**, **Runbook**, and **SNS** in the investigation panel.
4. Click **Report to Agent** — the Strands agent analyzes the same evidence and responds in markdown.
5. If the agent escalates, check the SNS tab and your subscribed email.

---

## What This Project Delivers

| Requirement | Implementation |
|-------------|----------------|
| **Strands Agent** | `@strands-agents/sdk` TypeScript agent with `BedrockModel`, `@tool`, and orchestration |
| **AgentCore Runtime** | Docker on ECR → AgentCore (`GET /ping`, `POST /invocations`) |
| **4 AWS-backed tools** | CloudWatch Logs, service health, runbooks, SNS escalation |
| **Session context** | Multi-turn chat with in-memory session history |
| **Production-style UI** | Service dashboard, investigation panel, incident triggers |
| **Real AWS integration** | Bedrock, CloudWatch, SNS (no mock for core tools) |
| **Deployed on AWS** | S3 + CloudFront (frontend), App Runner + AgentCore (backend) |

---

## Architecture

### Production (AWS)

```
                         ┌─────────────────────────────────────┐
                         │  CloudFront + S3 (React UI)         │
                         │  https://dj5efjm4yxqlb.cloudfront.net│
                         └──────────────┬──────────────────────┘
                                        │ HTTPS /api/*
                                        ▼
┌──────────────────────────────────────────────────────────────────┐
│  App Runner — Express + Strands Agent (port 8080)                │
│  https://mgfxskvu6f.us-east-1.awsapprunner.com                 │
│  /api/chat · /api/services · /health · /ping · /invocations      │
└──────────────┬───────────────────────────────────────────────────┘
               │
       ┌───────┼───────┬──────────────┐
       ▼       ▼       ▼              ▼
  Bedrock  CloudWatch  SNS      Runbooks (markdown)
  (Claude)   Logs

┌──────────────────────────────────────────────────────────────────┐
│  AgentCore Runtime (assessment contract)                         │
│  ECR: devops-incident-agent:latest (arm64)                       │
│  GET /ping · POST /invocations                                   │
└──────────────────────────────────────────────────────────────────┘
```

> **Note:** AgentCore exposes `/ping` and `/invocations` for the assessment contract. The full React UI (`/api/*`, mock services, investigation panel) is served via **App Runner** using the same Docker image (amd64 tag). Both run the identical Express + Strands backend.

### Local development

```
React (5173)  →  Express + Strands (3001)  →  AWS Services
                      ├── Amazon Bedrock
                      ├── CloudWatch Logs
                      ├── SNS
                      └── Runbooks
```

Detailed design decisions: [docs/architecture.md](docs/architecture.md)

---

## Features

### Agent & tools

- **Strands TypeScript SDK** — `Agent`, `BedrockModel`, custom `@tool` definitions
- **4 real AWS tools** (agent uses live AWS APIs, not mocked):
  - `query_cloudwatch_logs` — filter/search CloudWatch log group
  - `check_service_health` — ECS tasks + CloudWatch alarms
  - `lookup_runbook` — markdown runbooks in `backend/runbooks/`
  - `escalate_incident` — publish to SNS topic
- **Session-aware chat** — last 10 turns kept per session
- **Concurrent invoke protection** — request queue prevents agent lock errors
- **Markdown responses** — rendered in UI; internal `<thinking>` tags stripped

### Incident simulation (Phase 2)

- Mock **Payment**, **Cart**, and **Order** services with trigger/recover scenarios
- Incidents push **real log entries** to CloudWatch (`/devops/incident-demo`)
- **Investigation panel** — Logs, Health, Runbook, SNS tabs with live data
- **Report to Agent** — sends investigation snapshot to the Strands agent

### AgentCore contract

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/ping` | GET | Health check (`status: Healthy`) |
| `/invocations` | POST | Direct agent invoke (`{ "prompt": "..." }`) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Agent framework | [Strands Agents TypeScript SDK](https://github.com/strands-agents/sdk-typescript) |
| LLM | Amazon Bedrock (Claude Sonnet 4.5) |
| Backend | Node.js 20+, Express, TypeScript |
| Frontend | React 18, Vite |
| AWS deploy | AgentCore Runtime, ECR, App Runner, S3, CloudFront, SNS, CloudWatch |

---

## Project Structure

```
cloud/
├── backend/                    # Node.js + Strands Agent (single service)
│   ├── src/
│   │   ├── index.ts            # Express, /api/*, /ping, /invocations
│   │   ├── agent/              # Strands agent, prompts, tools
│   │   ├── routes/             # chat + services API
│   │   └── services/           # diagnostics, mock services, SNS store
│   ├── runbooks/               # Operational runbooks (markdown)
│   ├── Dockerfile              # Container for ECR / AgentCore / App Runner
│   └── .env.example
├── frontend/                   # React UI + login
│   └── src/
│       ├── App.jsx
│       ├── components/         # Dashboard, InvestigationPanel, Chat
│       └── auth.js             # Demo login gate
└── docs/
    ├── DEPLOY.md               # Full AWS deployment guide
    ├── architecture.md         # Design decisions + diagram
    └── AWS_SETUP.md            # AWS account setup
```

---

## Prerequisites

- **Node.js 20+**
- **Docker Desktop** (for container builds)
- **AWS CLI v2** configured for `us-east-1`
- **Amazon Bedrock** model access (Claude Sonnet 4.5 or Nova Pro)
- CloudWatch log group, SNS topic (see [docs/AWS_SETUP.md](docs/AWS_SETUP.md))

---

## Quick Start (Local)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # edit AWS settings
npm run dev            # http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Open **http://localhost:5173** — login with `sagar-test` / `Sagar@123`.

### Environment variables (backend)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (3001 local, 8080 container) |
| `AWS_REGION` | `us-east-1` |
| `BEDROCK_MODEL_ID` | Bedrock model ID |
| `CLOUDWATCH_LOG_GROUP` | e.g. `/devops/incident-demo` |
| `SNS_ESCALATION_TOPIC_ARN` | SNS topic for escalation |
| `CORS_ORIGIN` | Frontend origin URL |

---

## Deploy to AWS

Full step-by-step guide: **[docs/DEPLOY.md](docs/DEPLOY.md)**

Summary:

1. **Bedrock** — enable model access  
2. **CloudWatch + SNS** — log group and escalation topic  
3. **ECR** — build and push Docker image (`linux/arm64` for AgentCore)  
4. **AgentCore Runtime** — container from ECR, env vars, `/ping` + `/invocations`  
5. **App Runner** — same image (`amd64` tag) for public `/api/*` API  
6. **S3 + CloudFront** — static React build with `VITE_API_URL` pointing to App Runner  

---

## AgentCore Capabilities

| Capability | Used | Notes |
|------------|------|-------|
| **Runtime** | Yes | Docker on ECR, `/ping` + `/invocations` |
| **Bedrock** | Yes | Claude via `BedrockModel` |
| **Observability** | Yes | CloudWatch logs (runtime + incident demo group) |
| **Memory** | Partial | In-app session store (upgrade path: AgentCore Memory) |
| **Identity** | Demo | Simple login gate on frontend |
| **Gateway / MCP** | No | Custom Strands tools sufficient |

---

## Testing AgentCore Endpoints

```bash
# Health (App Runner or AgentCore invoke)
curl https://mgfxskvu6f.us-east-1.awsapprunner.com/health
curl https://mgfxskvu6f.us-east-1.awsapprunner.com/ping

# Direct invocation (AgentCore contract)
curl -X POST https://mgfxskvu6f.us-east-1.awsapprunner.com/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Payment API 503 in production. Triage briefly."}'
```

For IAM-protected AgentCore URLs, use the AWS CLI:

```bash
aws bedrock-agentcore invoke-agent-runtime \
  --agent-runtime-arn "arn:aws:bedrock-agentcore:us-east-1:148761674610:runtime/devops_incident_agent-0WPrnmHwNZ" \
  --qualifier DEFAULT \
  --runtime-session-id "demo-session-id-33chars-minimum-xx" \
  --payload fileb://payload.json \
  /tmp/out.txt
```

---

## AI Assistant Usage

This project was built with **[Cursor AI](https://cursor.com)** for:

- Strands TypeScript SDK integration and tool wiring
- React UI (dashboard, investigation panel, chat with markdown)
- AWS deployment troubleshooting (AgentCore, ECR, CloudFront, App Runner)
- Runbooks, deploy docs, and iterative bug fixes

---

## Documentation

| Doc | Description |
|-----|-------------|
| **[docs/architecture.md](docs/architecture.md)** | **Architecture diagram, assumptions, design decisions, AgentCore trade-offs** (primary reviewer doc) |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Complete AWS deployment guide |
| [docs/AWS_SETUP.md](docs/AWS_SETUP.md) | AWS account and resource setup |

### For reviewers (assessment deliverables)

All required submission items are in the repo:

1. **Architecture diagram** → [docs/architecture.md §1](docs/architecture.md#1-architecture-diagram-production) (Mermaid — renders on GitHub)
2. **Assumptions & design decisions** → [docs/architecture.md §3–4](docs/architecture.md#3-design-decisions)
3. **AgentCore capabilities & trade-offs** → [docs/architecture.md §5–6](docs/architecture.md#5-agentcore-capabilities--what-we-used--why)
4. **Live demo** → https://dj5efjm4yxqlb.cloudfront.net (login: `sagar-test` / `Sagar@123`)
5. **Source code** → this repository

---

## License

MIT
