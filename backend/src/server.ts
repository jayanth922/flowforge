import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { logger } from "./utils/logger.js";
import { connectPostgres } from "./db/postgres.js";
import { connectMongo } from "./db/mongo.js";
import { runMigrations } from "./db/migrate.js";
import { seedIfEmpty } from "./db/seed.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { requestLogger } from "./middleware/requestLogger.js";
import {
  globalLimiter,
  authLimiter,
  compileLimiter,
  webhookLimiter,
} from "./middleware/rateLimiter.js";
import { authRouter } from "./routes/auth.js";
import { workflowRouter } from "./routes/workflows.js";
import {
  workflowExecuteRouter,
  executionRouter,
} from "./routes/executions.js";
import { demoRouter } from "./routes/demo.js";
import { webhookRouter } from "./routes/webhooks.js";

const app = express();
const PORT = process.env["PORT"] ?? 4000;

app.use(
  cors({
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
  }),
);
app.use(helmet());
app.use(express.json());
app.use(requestLogger);
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
app.use("/api/v1/webhooks", webhookLimiter, webhookRouter);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await runMigrations();
    await connectPostgres();
  } catch (err) {
    logger.fatal({ err }, "failed to start");
    process.exit(1);
  }

  try {
    await connectMongo();
  } catch (err) {
    logger.warn({ err }, "MongoDB connection failed, continuing without MongoDB");
  }

  try {
    await seedIfEmpty();
  } catch (err) {
    logger.warn({ err }, "seed failed, continuing without seed data");
  }

  app.listen(PORT, () => {
    logger.info({ port: PORT }, "server running");
  });
};

start();
