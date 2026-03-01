import type { IntegrationResult } from "./types.js";
import { sendEmail } from "./resend.js";
import { postToSlack } from "./slack.js";
import { postToDiscord } from "./discord.js";
import { createGithubIssue } from "./github.js";
import { makeHttpRequest } from "./httpRequest.js";

export type IntegrationHandler = (
  config: Record<string, unknown>,
  context: Record<string, unknown>,
  credentials?: Record<string, unknown>,
) => Promise<IntegrationResult>;

const asHandler = (fn: unknown): IntegrationHandler => fn as IntegrationHandler;

export const integrationRegistry: Record<string, IntegrationHandler> = {
  send_email: asHandler(sendEmail),
  post_slack: asHandler(postToSlack),
  post_discord: asHandler(postToDiscord),
  create_github_issue: asHandler(createGithubIssue),
  http_request: asHandler(makeHttpRequest),
};

export { renderTemplate } from "./templateEngine.js";
export type { IntegrationResult } from "./types.js";
