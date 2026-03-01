import { renderTemplate } from "./templateEngine.js";
import type { IntegrationResult } from "./types.js";

interface HttpRequestConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: string;
  extractPath?: string;
}

const extractByPath = (obj: unknown, path: string): unknown => {
  let current: unknown = obj;
  for (const segment of path.split(".")) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(segment);
      if (Number.isNaN(idx)) return undefined;
      current = current[idx];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
};

export const makeHttpRequest = async (
  config: HttpRequestConfig,
  context: Record<string, unknown>,
  credentials?: Record<string, unknown>,
): Promise<IntegrationResult> => {
  const url = renderTemplate(config.url, context);

  const headers: Record<string, string> = {};
  if (config.headers) {
    for (const [key, value] of Object.entries(config.headers)) {
      headers[key] = renderTemplate(value, context);
    }
  }
  const credHeaders = credentials?.["headers"];
  if (credHeaders && typeof credHeaders === "object" && credHeaders !== null) {
    for (const [key, value] of Object.entries(credHeaders as Record<string, string>)) {
      headers[key] = value;
    }
  }

  const omitBody = config.method === "GET" || config.method === "DELETE";
  const body =
    !omitBody && config.body
      ? renderTemplate(config.body, context)
      : undefined;

  try {
    const response = await fetch(url, {
      method: config.method,
      headers,
      body,
    });

    let parsedBody: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      parsedBody = await response.json();
    } else {
      parsedBody = await response.text();
    }

    const result: Record<string, unknown> = {
      status: response.status,
      response: parsedBody,
    };

    if (config.extractPath) {
      result["extracted"] = extractByPath(parsedBody, config.extractPath);
    }

    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
};
