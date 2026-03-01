import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  createIntegration,
  listIntegrations,
  deleteIntegration,
  type IntegrationService,
} from "../models/integrationPg.model.js";

export const integrationRouter = Router();

integrationRouter.use(requireAuth);

const serviceEnum = z.enum(["slack", "discord", "github", "http"]);

const slackCredentials = z.object({ webhookUrl: z.string().url() });
const discordCredentials = z.object({ webhookUrl: z.string().url() });
const githubCredentials = z.object({
  token: z.string().min(1),
  owner: z.string().min(1),
  repo: z.string().min(1),
});
const httpCredentials = z.object({ headers: z.record(z.string()) });

const createSchema = z.object({
  service: serviceEnum,
  name: z.string().min(1).max(100),
  credentials: z.record(z.unknown()),
});

const testSchema = z.object({
  service: z.enum(["slack", "discord", "github"]),
  credentials: z.record(z.unknown()),
});

const validateCredentials = (
  service: IntegrationService,
  credentials: Record<string, unknown>,
): { success: boolean; error?: string } => {
  switch (service) {
    case "slack": {
      const r = slackCredentials.safeParse(credentials);
      return r.success ? { success: true } : { success: false, error: r.error.errors.map((e) => e.message).join(", ") };
    }
    case "discord": {
      const r = discordCredentials.safeParse(credentials);
      return r.success ? { success: true } : { success: false, error: r.error.errors.map((e) => e.message).join(", ") };
    }
    case "github": {
      const r = githubCredentials.safeParse(credentials);
      return r.success ? { success: true } : { success: false, error: r.error.errors.map((e) => e.message).join(", ") };
    }
    case "http": {
      const r = httpCredentials.safeParse(credentials);
      return r.success ? { success: true } : { success: false, error: r.error.errors.map((e) => e.message).join(", ") };
    }
  }
};

integrationRouter.get("/", async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const serviceParam = req.query["service"];
    const service =
      typeof serviceParam === "string" && serviceEnum.safeParse(serviceParam).success
        ? (serviceParam as IntegrationService)
        : undefined;

    const integrations = await listIntegrations(tenantId, service);
    res.status(200).json({ success: true, data: integrations });
  } catch (err) {
    next(err);
  }
});

integrationRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { service, name, credentials } = parsed.data;
    const credValidation = validateCredentials(service, credentials);
    if (!credValidation.success) {
      res.status(400).json({
        success: false,
        error: credValidation.error,
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    const { tenantId } = req.user!;
    const integration = await createIntegration(tenantId, service, name, credentials);
    res.status(201).json({ success: true, data: integration });
  } catch (err) {
    next(err);
  }
});

integrationRouter.delete("/:id", async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const deleted = await deleteIntegration(id, tenantId);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: "Integration not found",
        code: "NOT_FOUND",
      });
      return;
    }

    res.status(200).json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

integrationRouter.post("/test", async (req, res, next) => {
  try {
    const parsed = testSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { service, credentials } = parsed.data;

    if (service === "slack" || service === "discord") {
      const urlParsed = z.string().url().safeParse(credentials["webhookUrl"]);
      if (!urlParsed.success) {
        res.status(400).json({
          success: false,
          error: "Invalid webhook URL",
          code: "INVALID_CREDENTIALS",
        });
        return;
      }

      const payload =
        service === "slack"
          ? { text: "FlowForge connected successfully! \u2705" }
          : { content: "FlowForge connected successfully! \u2705" };

      const response = await fetch(urlParsed.data, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        res.status(200).json({
          success: false,
          error: `Webhook returned ${response.status}: ${body}`,
          code: "TEST_FAILED",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { message: "Connection successful — test message sent" },
      });
      return;
    }

    if (service === "github") {
      const token = credentials["token"];
      if (typeof token !== "string" || !token) {
        res.status(400).json({
          success: false,
          error: "Missing GitHub token",
          code: "INVALID_CREDENTIALS",
        });
        return;
      }

      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "FlowForge",
        },
      });

      if (!response.ok) {
        res.status(200).json({
          success: false,
          error: `GitHub API returned ${response.status} — invalid token`,
          code: "TEST_FAILED",
        });
        return;
      }

      const user = (await response.json()) as { login: string };
      res.status(200).json({
        success: true,
        data: { message: `Connected as GitHub user: ${user.login}` },
      });
      return;
    }
  } catch (err) {
    next(err);
  }
});
