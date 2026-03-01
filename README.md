# FlowForge

**Live Demo:** [PLACEHOLDER URL]
**Demo credentials:** `demo@flowforge.com` / `Demo1234!`

FlowForge is a workflow automation engine that lets you describe business processes in plain English and compiles them into executable DAGs using AI. Visualize, edit, and run multi-step workflows — from payment retries to user onboarding — all from a single interface. Built as a full-stack TypeScript application with a React canvas and a Groq-powered LLM compiler.

<!-- Add screenshot here -->

## Tech Stack

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_AI-LLaMA_3.3-F55036)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&logoColor=white)

## Local Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url> && cd flowforge
   npm install --prefix backend && npm install --prefix frontend
   ```

2. **Start databases** (requires Docker)
   ```bash
   docker compose up -d
   ```

3. **Configure environment** — copy and fill in your API key
   ```bash
   cp backend/.env.example backend/.env
   # Set GROQ_API_KEY (free at console.groq.com)
   ```

4. **Run migrations and seed demo data**
   ```bash
   npm run migrate --prefix backend
   npm run seed --prefix backend
   ```

5. **Start the app**
   ```bash
   npm run dev --prefix backend   # API at http://localhost:4000
   npm run dev --prefix frontend  # UI  at http://localhost:5173
   ```
