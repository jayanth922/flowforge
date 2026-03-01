import type { ErrorRequestHandler } from "express";
import { logger } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const message = err instanceof Error ? err.message : "Unknown error";

  logger.error({ err, requestId: req.id }, "unhandled error");

  res.status(500).json({
    success: false,
    error: message,
    code: "INTERNAL_ERROR",
  });
};
