import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : "Unknown error";

  if (process.env["NODE_ENV"] !== "production") {
    console.error("[error]", err instanceof Error ? err.stack : err);
  }

  res.status(500).json({
    success: false,
    error: message,
    code: "INTERNAL_ERROR",
  });
};
