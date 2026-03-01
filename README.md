# FlowForge

**Live Demo:** https://flowforge-tau.vercel.app
**Demo credentials:** `demo@flowforge.com` / `Demo1234!`

> Natural language workflow automation engine — describe a business
> process in plain English and watch it compile into an executable
> visual workflow in real-time.

![Node.js](https://img.shields.io/badge/Node.js-20-green)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![AI](https://img.shields.io/badge/AI-Groq%20Llama%203.3-orange)

<!-- Add demo GIF here -->

## What It Does
- Type a plain English workflow description
- LLM compiles it into a visual node graph (DAG) in real-time
- Execute the workflow and watch each node light up with live status
- Full execution logs with per-step timing and output

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js, TypeScript |
| Frontend | React 18, ReactFlow, TailwindCSS |
| AI/LLM | Groq API (Llama 3.3 70B) |
| SQL DB | PostgreSQL via Supabase |
| NoSQL DB | MongoDB Atlas |
| Auth | JWT (access + refresh tokens) |
| DevOps | Docker, Render, Vercel, GitHub Actions |

## Local Setup
1. Clone the repo: `git clone https://github.com/YOUR_USERNAME/flowforge`
2. Copy env files: `cp backend/.env.example backend/.env` and fill values
3. Start databases: `docker compose up -d`
4. Install and run backend: `cd backend && npm install && npm run migrate && npm run seed && npm run dev`
5. Install and run frontend: `cd frontend && npm install && npm run dev`
6. Open http://localhost:3000

## Architecture
- **LLM Compiler:** Groq Llama 3.3 70B with Zod schema validation
  compiles natural language to typed workflow DAGs
- **Execution Engine:** Topological DAG traversal with per-node retry
  logic, fault isolation, and real-time status via polling
- **Multi-tenant:** JWT-based tenant isolation across all data layers
- **Dual DB:** PostgreSQL for structured metadata + audit trail,
  MongoDB for variable-schema DAG definitions and execution logs
