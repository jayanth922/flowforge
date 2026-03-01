import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectPostgres } from "./db/postgres.js";
import { connectMongo } from "./db/mongo.js";
import { runMigrations } from "./db/migrate.js";
import { seedIfEmpty } from "./db/seed.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import {
  globalLimiter,
  authLimiter,
  compileLimiter,
} from "./middleware/rateLimiter.js";
import { authRouter } from "./routes/auth.js";
import { workflowRouter } from "./routes/workflows.js";
import {
  workflowExecuteRouter,
  executionRouter,
} from "./routes/executions.js";
import { demoRouter } from "./routes/demo.js";

const app = express();
const PORT = process.env["PORT"] ?? 4000;

app.use(
  cors({
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
  }),
);
app.use(helmet());
app.use(express.json());
app.use(globalLimiter);

app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
});

app.use("/api/v1/auth", authLimiter, authRouter);
app.use("/api/v1/workflows/compile", compileLimiter);
app.use("/api/v1/workflows", workflowRouter);
app.use("/api/v1/workflows", workflowExecuteRouter);
app.use("/api/v1/executions", executionRouter);
app.use("/api/v1/demo", demoRouter);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await runMigrations();
    await connectPostgres();
  } catch (err) {
    console.error("[server] failed to start:", err);
    process.exit(1);
  }

  try {
    await connectMongo();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      "[mongo] connection failed, continuing without MongoDB:",
      message,
    );
  }

  try {
    await seedIfEmpty();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[seed] failed, continuing without seed data:", message);
  }

  app.listen(PORT, () => {
    console.log(`[server] running on http://localhost:${PORT}`);
  });
};

start();
