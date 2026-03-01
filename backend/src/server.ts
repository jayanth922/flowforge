import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectPostgres } from "./db/postgres.js";
import { connectMongo } from "./db/mongo.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { authRouter } from "./routes/auth.js";
import { workflowRouter } from "./routes/workflows.js";

const app = express();
const PORT = process.env["PORT"] ?? 4000;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/workflows", workflowRouter);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await connectPostgres();
    await connectMongo();

    app.listen(PORT, () => {
      console.log(`[server] running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("[server] failed to start:", err);
    process.exit(1);
  }
};

start();
