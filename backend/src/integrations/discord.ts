import { renderTemplate } from "./templateEngine.js";
import type { IntegrationResult } from "./types.js";

interface DiscordConfig {
  webhookUrl: string;
  message: string;
  username?: string;
}

export const postToDiscord = async (
  config: DiscordConfig,
  context: Record<string, unknown>,
  credentials?: Record<string, unknown>,
): Promise<IntegrationResult> => {
  const renderedMessage = renderTemplate(config.message, context);
  const username = config.username ?? "FlowForge";

  const webhookUrl =
    (credentials?.["webhookUrl"] as string | undefined) ?? config.webhookUrl;
  if (!webhookUrl) {
    return { success: false, error: "No Discord webhook URL configured" };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: renderedMessage, username }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        error: `Discord webhook failed: ${response.status} ${body}`,
      };
    }

    return { success: true, data: { message: renderedMessage } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
};
