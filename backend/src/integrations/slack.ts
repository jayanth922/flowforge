import { renderTemplate } from "./templateEngine.js";
import type { IntegrationResult } from "./types.js";

interface SlackConfig {
  webhookUrl: string;
  message: string;
  username?: string;
}

export const postToSlack = async (
  config: SlackConfig,
  context: Record<string, unknown>,
): Promise<IntegrationResult> => {
  const renderedMessage = renderTemplate(config.message, context);
  const username = config.username ?? "FlowForge";

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: renderedMessage, username }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        error: `Slack webhook failed: ${response.status} ${body}`,
      };
    }

    return { success: true, data: { message: renderedMessage } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
};
