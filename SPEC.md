# FlowForge — Project Spec

## What it does
A natural language workflow automation engine that compiles plain English 
instructions into executable visual workflow DAGs, allowing non-technical 
users to automate multi-step business processes without writing code.

## Demo Scenario (60 seconds)
1. User types: "When a payment fails, retry 3 times at 1-hour intervals, 
   then notify the account owner via email and flag the transaction for review"
2. LLM compiles it into a visual node graph in real-time
3. User hits Execute on a mock trigger
4. Watches each step execute with status indicators
5. Views full execution log

## Tech Stack
- Backend: Node.js, Express.js, TypeScript
- Frontend: React 18, TypeScript, ReactFlow, TailwindCSS
- PostgreSQL: Supabase (users, tenants, execution metadata, audit trail)
- MongoDB: Atlas free tier (workflow DAG definitions, execution step logs)
- Auth: JWT (access 15min, refresh 7d)
- LLM: OpenAI API with structured JSON output + Zod validation
- Deployment: Vercel (frontend), Render (backend), $0 cost

## Features IN Scope
1. Natural language → workflow DAG compiler (LLM)
2. ReactFlow visual editor to inspect/modify compiled workflows
3. Workflow execution state machine with retry logic
4. Execution logs per step with status tracking
5. JWT auth + multi-tenant isolation
6. Demo mode with 3 preloaded workflow templates (no signup needed)

## Features NOT in Scope
- Real email sending (mock it)
- Payment gateway integration (mock triggers only)
- Team collaboration / sharing
- Paid plans or billing
- Mobile responsiveness

## Folder Structure
flowforge/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── agents/
│   │   └── db/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── store/
│   └── package.json
├── .cursor/
│   └── rules/
│       └── main.mdc
├── docker-compose.yml
└── SPEC.md
