import { Octokit } from "@octokit/rest";
import { renderTemplate } from "./templateEngine.js";
import type { IntegrationResult } from "./types.js";

interface GithubIssueConfig {
  owner: string;
  repo: string;
  title: string;
  body: string;
  labels?: string[];
}

export const createGithubIssue = async (
  config: GithubIssueConfig,
  context: Record<string, unknown>,
): Promise<IntegrationResult> => {
  const token = process.env["GITHUB_TOKEN"];
  if (!token) {
    return { success: false, error: "GITHUB_TOKEN not configured" };
  }

  const title = renderTemplate(config.title, context);
  const body = renderTemplate(config.body, context);

  try {
    const octokit = new Octokit({ auth: token });
    const response = await octokit.rest.issues.create({
      owner: config.owner,
      repo: config.repo,
      title,
      body,
      labels: config.labels,
    });

    return {
      success: true,
      data: {
        issueNumber: response.data.number,
        issueUrl: response.data.html_url,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
};
