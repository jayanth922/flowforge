# FlowForge — Deployment Guide

## Backend Environment Variables (Render Dashboard)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string | `postgresql://user:pass@db.xxxx.supabase.co:5432/postgres` |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/flowforge` |
| `JWT_SECRET` | Yes | Random 64-char string for access tokens | Generate: `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Yes | Different random 64-char string for refresh tokens | Generate: `openssl rand -hex 32` |
| `GROQ_API_KEY` | Yes | Free API key from console.groq.com | `gsk_...` |
| `FRONTEND_URL` | Yes | Vercel deployment URL (for CORS) | `https://flowforge.vercel.app` |
| `BASE_URL` | Yes | Backend public URL | `https://flowforge-backend.onrender.com` |
| `RESEND_API_KEY` | Yes | Resend API key for email integration | `re_...` |
| `GITHUB_TOKEN` | No | GitHub PAT for issue creation integration | `ghp_...` |
| `ENCRYPTION_KEY` | Yes | 64-char hex string for credential encryption | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | Yes | Set to `production` | `production` |
| `PORT` | No | Auto-injected by Render — do **not** set manually | — |

## Frontend Environment Variables (Vercel Dashboard)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Render backend URL | `https://flowforge-backend.onrender.com` |

## Deploy Backend on Render

1. Push your repository to GitHub
2. Go to [render.com](https://render.com) → New → **Web Service**
3. Connect your GitHub repo
4. Render will detect `render.yaml` — select **flowforge-backend**
5. Set all backend environment variables listed above
6. Deploy — Render builds the Docker image and starts the service
7. Copy the `.onrender.com` URL for the next step

## Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
2. Set **Root Directory** to `frontend`
3. Framework Preset: **Vite**
4. Add environment variable: `VITE_API_URL` = your Render backend URL
5. Deploy

## Post-Deploy: Set CORS

After both services are live, go back to Render and set:

```
FRONTEND_URL=https://your-project.vercel.app
```

This allows the frontend to make API requests to the backend.

## Verify

1. Visit your Render URL at `/api/v1/health` — should return `{ "success": true, "data": { "status": "ok" } }`
2. Visit your Vercel URL — should show the FlowForge login page
3. Register a new account to get started
