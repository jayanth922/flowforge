# FlowForge — Project Spec

## What it does

A natural language workflow automation engine that compiles plain English
instructions into executable visual workflow DAGs, allowing non-technical
users to automate multi-step business processes without writing code.

## Tech Stack

- Backend: Node.js, Express.js, TypeScript
- Frontend: React 18, TypeScript, ReactFlow, TailwindCSS
- PostgreSQL: Supabase (users, tenants, workflows, executions, integrations)
- MongoDB: Atlas (workflow DAG definitions, execution step logs)
- Auth: JWT (access 15min, refresh 7d)
- LLM: Groq API (Llama 3.3 70B) with structured JSON output + Zod validation
- Deployment: Vercel (frontend), Render (backend), Supabase, MongoDB Atlas

## Features IN Scope (Implemented)

1. Natural language → workflow DAG compiler (Groq LLM)
2. ReactFlow visual editor to inspect/modify compiled workflows
3. Workflow execution with real integrations (Resend, Slack, Discord, GitHub, HTTP)
4. Per-tenant integrations with AES-256 encrypted credentials
5. Triggers: manual, webhook, schedule (node-cron)
6. Execution logs per step with status tracking
7. JWT auth + multi-tenant isolation
8. Template library (UI-defined prompts + DAGs)
9. No demo mode — requires registration

## Features NOT in Scope

- Team collaboration / sharing
- Paid plans or billing
- Mobile responsiveness (desktop-first)

## Folder Structure

```
flowforge/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── integrations/
│   │   ├── agents/
│   │   ├── middleware/
│   │   └── db/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── store/
│   └── package.json
├── .cursor/
│   └── rules/
│       └── main.mdc
├── docker-compose.yml
├── DEPLOYMENT.md
└── SPEC.md
```
