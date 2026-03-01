import { Resend } from "resend";
import { renderTemplate } from "./templateEngine.js";
import type { IntegrationResult } from "./types.js";

interface ResendConfig {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export const sendEmail = async (
  config: ResendConfig,
  context: Record<string, unknown>,
): Promise<IntegrationResult> => {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const to = renderTemplate(config.to, context);
  const subject = renderTemplate(config.subject, context);
  const html = renderTemplate(config.body, context);
  const from = config.from
    ? renderTemplate(config.from, context)
    : "FlowForge <onboarding@resend.dev>";

  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({ from, to, subject, html });

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return {
      success: true,
      data: { messageId: response.data?.id, to, subject },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
};
