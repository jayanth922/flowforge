# FlowForge

> Natural language workflow automation engine — describe a business
> process in plain English and watch it compile into an executable
> visual workflow in real-time.

![Node.js](https://img.shields.io/badge/Node.js-20-green)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![AI](https://img.shields.io/badge/AI-Groq%20Llama%203.3-orange)

<!-- Add screenshot here -->

---

## What It Does

- Type a plain English workflow description
- LLM compiles it into a visual node graph (DAG) in real-time
- Execute the workflow and watch each node light up with live status
- Full execution logs with per-step timing and output
- Connect Slack, Discord, GitHub — credentials stored encrypted per-tenant
- Trigger workflows via webhooks or cron schedules

---

## Features (Current State)

| Feature | Description |
|---------|-------------|
| **Auth** | Register (creates tenant + admin user), Login, JWT access/refresh tokens |
| **Workflow Compile** | Natural language → DAG via Groq Llama 3.3 70B, Zod schema validation |
| **Workflow Editor** | ReactFlow canvas, node config panel, integration selection per action node |
| **Execution** | Topological DAG traversal, per-node retry, real integrations (no mocks) |
| **Integrations** | Resend (email), Slack, Discord, GitHub, HTTP — per-tenant with AES-256 encrypted credentials |
| **Triggers** | Manual (Execute), Webhook (POST URL), Schedule (node-cron) |
| **Templates** | UI-defined templates; "Use This Template" loads prompt + DAG into editor |
| **Multi-tenant** | JWT tenant isolation; all data scoped by `tenant_id` |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express.js, TypeScript |
| Frontend | React 18, ReactFlow, TailwindCSS, Vite |
| AI/LLM | Groq API (Llama 3.3 70B) |
| SQL DB | PostgreSQL (Supabase) — users, tenants, workflows, executions, integrations |
| NoSQL DB | MongoDB Atlas — DAG definitions, execution step logs |
| Auth | JWT (access 15min, refresh 7d) |
| DevOps | Docker, Render, Vercel |

---

## Project Structure

```
flowforge/
├── backend/
│   ├── src/
│   │   ├── agents/          # LLM compiler, DAG Zod schema
│   │   ├── db/              # PostgreSQL pool, MongoDB connect, migrations
│   │   ├── integrations/    # Resend, Slack, Discord, GitHub, HTTP handlers
│   │   ├── middleware/      # auth, rate limit, error, request logger
│   │   ├── models/          # user, workflowPg, integrationPg, workflow (Mongoose)
│   │   ├── routes/          # auth, workflows, executions, webhooks, integrations
│   │   ├── services/        # authService, executionService, schedulerService
│   │   └── utils/           # logger, encryption (AES-256-GCM)
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # NavHeader, ProtectedRoute, workflow/*, PromptPanel
│   │   ├── hooks/           # useExecutionStatus
│   │   ├── pages/           # Login, Register, Dashboard, WorkflowEditor, Integrations, Templates
│   │   ├── services/        # api.ts (Axios + typed functions)
│   │   ├── store/           # authStore (Zustand)
│   │   └── types/           # api.ts types
│   └── vercel.json
├── docker-compose.yml       # PostgreSQL + MongoDB for local dev
├── DEPLOYMENT.md
└── SPEC.md
```

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/health` | No | Health check |
| POST | `/api/v1/auth/register` | No | Create tenant + user |
| POST | `/api/v1/auth/login` | No | Get tokens |
| POST | `/api/v1/auth/refresh` | No | Refresh access token |
| POST | `/api/v1/auth/logout` | No | 200 (stateless) |
| POST | `/api/v1/workflows/compile` | Yes | `{ prompt }` → `{ workflowId, dag }` |
| GET | `/api/v1/workflows` | Yes | List workflows (tenant-scoped) |
| GET | `/api/v1/workflows/:id/dag` | Yes | Get latest DAG |
| PUT | `/api/v1/workflows/:id/dag` | Yes | Update DAG |
| POST | `/api/v1/workflows/:id/execute` | Yes | `{ triggerPayload? }` → `{ executionId }` |
| GET | `/api/v1/workflows/:id/webhook` | Yes | Webhook status |
| POST | `/api/v1/workflows/:id/webhook/enable` | Yes | Enable webhook |
| POST | `/api/v1/workflows/:id/webhook/disable` | Yes | Disable webhook |
| GET | `/api/v1/workflows/validate-cron?expr=` | Yes | Validate cron expression |
| GET | `/api/v1/workflows/stats` | Yes | Per-workflow execution stats |
| GET | `/api/v1/executions/:id/status` | Yes | Execution status + steps |
| POST | `/api/v1/webhooks/trigger/:secret` | No | Trigger workflow (public) |
| GET | `/api/v1/integrations` | Yes | List integrations |
| POST | `/api/v1/integrations` | Yes | `{ service, credentials, name? }` |
| DELETE | `/api/v1/integrations/:id` | Yes | Delete integration |

---

## Database

**PostgreSQL** (via `pg`, no ORM):

- `tenants` — id, name
- `users` — id, tenant_id, email, password_hash, role
- `workflows` — id, tenant_id, name, status, webhook_secret, webhook_enabled
- `workflow_executions` — id, workflow_id, tenant_id, status
- `tenant_integrations` — id, tenant_id, service, name, credentials (encrypted)
- `schema_migrations` — migration tracking

**MongoDB** (Mongoose):

- `WorkflowDAG` — workflowId, tenantId, version, dag (nodes, edges)
- `ExecutionLog` — executionId, stepId, status, input, output

**Migrations:** Run automatically on server startup from `backend/src/db/migrations/*.sql`. No seed script — app starts with empty data; users register to create tenants.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Access token signing |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing |
| `GROQ_API_KEY` | Yes | Groq API key (console.groq.com) |
| `RESEND_API_KEY` | Yes | Resend.com for send_email nodes |
| `ENCRYPTION_KEY` | Yes | 64-char hex for tenant credentials (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `FRONTEND_URL` | Yes | CORS origin |
| `BASE_URL` | Yes | Backend public URL (webhooks) |
| `PORT` | No | Default 3001 |

---

## Local Setup

1. Clone: `git clone https://github.com/YOUR_USERNAME/flowforge`
2. Copy env: `cp backend/.env.example backend/.env` and fill values
3. Databases: `docker compose up -d`
4. Backend: `cd backend && npm install && npm run migrate && npm run dev`
5. Frontend: `cd frontend && npm install && npm run dev`
6. Open http://localhost:3000 and register

---

## Architecture Highlights

- **LLM Compiler:** Groq Llama 3.3 70B + Zod schema; outputs DAG with node types (trigger, condition, delay, send_email, post_slack, etc.). Uses `integrationId: "PLACEHOLDER"` for integration nodes; user selects real integration in UI.
- **Execution:** Topological sort → execute nodes in order. Fetches decrypted credentials from `tenant_integrations` for Slack/Discord/GitHub/HTTP. Resend uses server `RESEND_API_KEY`. Template engine for `{{payload.field}}` substitution.
- **Scheduler:** `node-cron` for schedule triggers; loads enabled workflows on startup; validates cron via `cronstrue`/`cron-parser`.
- **Conventions:** All responses `{ success, data? }` or `{ success: false, error, code }`; Zod validation; parameterized queries; no `any`; functional style.

---

## Conventions (for agents continuing this project)

1. Propose a plan before writing code; wait for approval
2. TypeScript strict — infer from Zod, no `any`
3. API prefix: `/api/v1/`
4. Parameterized queries only
5. Success: `{ success: true, data: T }`; Error: `{ success: false, error: string, code: string }`
6. Run `tsc --noEmit` after changes
