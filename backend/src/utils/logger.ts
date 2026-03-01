import pino from "pino";

const isDev = process.env["NODE_ENV"] !== "production";

export const logger = pino({
  level: isDev ? "debug" : "info",
  base: { service: "flowforge-api" },
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});
