import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavHeader from "../components/NavHeader";
import WorkflowCanvas from "../components/workflow/WorkflowCanvas";
import type { DAGNode, DAGEdge } from "../types/api";
import "@xyflow/react/dist/style.css";

interface Template {
  name: string;
  description: string;
  prompt: string;
  tags: string[];
  nodes: DAGNode[];
  edges: DAGEdge[];
}

const TAG_COLORS: Record<string, string> = {
  Payments: "bg-yellow-500/20 text-yellow-300",
  Slack: "bg-emerald-500/20 text-emerald-300",
  GitHub: "bg-gray-500/20 text-gray-300",
  Email: "bg-green-500/20 text-green-300",
  Discord: "bg-indigo-500/20 text-indigo-300",
  API: "bg-cyan-500/20 text-cyan-300",
  Schedule: "bg-orange-500/20 text-orange-300",
};

const TEMPLATES: Template[] = [
  {
    name: "Payment Alert Pipeline",
    description:
      "Checks payment amount, alerts Slack, creates GitHub issue for fraud review, and emails the customer.",
    prompt:
      "When a payment fails, check if amount > $500, alert Slack, create GitHub issue for fraud review, then email the customer",
    tags: ["Payments", "Slack", "GitHub", "Email"],
    nodes: [
      { id: "node_1", type: "trigger", label: "Payment Failed", config: { triggerType: "webhook" }, position: { x: 0, y: 0 } },
      { id: "node_2", type: "condition", label: "High Value?", config: { expression: "{{payload.amount}} > 500" }, position: { x: 250, y: 0 } },
      { id: "node_3", type: "post_slack", label: "Alert Slack", config: { integrationId: "PLACEHOLDER", message: "\u{1F6A8} High-value payment failed!\nAmount: ${{payload.amount}}\nCustomer: {{payload.customer_name}}\nTransaction: {{payload.transaction_id}}" }, position: { x: 500, y: 0 } },
      { id: "node_4", type: "create_github_issue", label: "Create Review Issue", config: { integrationId: "PLACEHOLDER", title: "Fraud Review: TXN-{{payload.transaction_id}}", body: "Amount: ${{payload.amount}}\nCustomer: {{payload.customer_email}}\nRequires manual review.", labels: ["fraud-review", "high-priority"] }, position: { x: 750, y: 0 } },
      { id: "node_5", type: "send_email", label: "Notify Customer", config: { to: "{{payload.customer_email}}", subject: "Action Required: Payment of ${{payload.amount}} failed", body: "Dear {{payload.customer_name}},\n\nYour payment could not be processed.\n\nPlease update your payment method.\n\nFlowForge Payments Team" }, position: { x: 1000, y: 0 } },
    ],
    edges: [
      { id: "edge_1", source: "node_1", target: "node_2", label: "then" },
      { id: "edge_2", source: "node_2", target: "node_3", label: "if true" },
      { id: "edge_3", source: "node_3", target: "node_4", label: "then" },
      { id: "edge_4", source: "node_4", target: "node_5", label: "then" },
    ],
  },
  {
    name: "Daily Tech Digest",
    description:
      "Fetches posts from an API on a daily schedule, formats a digest, and posts it to Discord.",
    prompt:
      "Every day at 9am, fetch latest posts from an API, format them into a digest, and post to Discord",
    tags: ["Schedule", "API", "Discord"],
    nodes: [
      { id: "node_1", type: "trigger", label: "Daily 9am", config: { triggerType: "schedule", cronExpression: "0 9 * * *" }, position: { x: 0, y: 0 } },
      { id: "node_2", type: "http_request", label: "Fetch Posts", config: { method: "GET", url: "https://jsonplaceholder.typicode.com/posts?_limit=3", extractPath: "data" }, position: { x: 250, y: 0 } },
      { id: "node_3", type: "data_transform", label: "Format Digest", config: { extractPath: "steps.node_2.output", outputKey: "digest" }, position: { x: 500, y: 0 } },
      { id: "node_4", type: "post_discord", label: "Post to Discord", config: { integrationId: "PLACEHOLDER", message: "\u{1F4F0} Daily Tech Digest\n\nFetched items from API" }, position: { x: 750, y: 0 } },
    ],
    edges: [
      { id: "edge_1", source: "node_1", target: "node_2", label: "at 9am daily" },
      { id: "edge_2", source: "node_2", target: "node_3", label: "fetched" },
      { id: "edge_3", source: "node_3", target: "node_4", label: "formatted" },
    ],
  },
  {
    name: "User Onboarding Flow",
    description:
      "Sends a welcome email to new users, waits briefly, then creates a GitHub issue to track the signup.",
    prompt:
      "When a new user signs up, send a welcome email, wait briefly, then create a GitHub issue to track the new user",
    tags: ["Email", "GitHub"],
    nodes: [
      { id: "node_1", type: "trigger", label: "User Signed Up", config: { triggerType: "webhook" }, position: { x: 0, y: 0 } },
      { id: "node_2", type: "send_email", label: "Welcome Email", config: { to: "{{payload.user_email}}", subject: "Welcome to FlowForge, {{payload.user_name}}!", body: "Hi {{payload.user_name}},\n\nWelcome! Your {{payload.plan}} plan is now active.\n\nThe FlowForge Team" }, position: { x: 250, y: 0 } },
      { id: "node_3", type: "delay", label: "Wait 2 Seconds", config: { duration: 2, unit: "seconds" }, position: { x: 500, y: 0 } },
      { id: "node_4", type: "create_github_issue", label: "Log New User", config: { integrationId: "PLACEHOLDER", title: "New {{payload.plan}} user: {{payload.user_name}}", body: "Email: {{payload.user_email}}\nPlan: {{payload.plan}}", labels: ["new-user"] }, position: { x: 750, y: 0 } },
    ],
    edges: [
      { id: "edge_1", source: "node_1", target: "node_2", label: "then" },
      { id: "edge_2", source: "node_2", target: "node_3", label: "sent" },
      { id: "edge_3", source: "node_3", target: "node_4", label: "after delay" },
    ],
  },
];

const TemplateCard = ({ template }: { template: Template }) => {
  const [showPreview, setShowPreview] = useState(false);
  const navigate = useNavigate();

  const handleUseTemplate = () => {
    localStorage.setItem(
      "flowforge_template",
      JSON.stringify({
        prompt: template.prompt,
        nodes: template.nodes,
        edges: template.edges,
      }),
    );
    navigate("/workflows/new");
  };

  return (
    <div className="group overflow-hidden rounded-xl border border-white/5 bg-gray-900/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:bg-gray-800/60 shadow-lg hover:shadow-purple-500/10">
      <div className="p-6">
        <h3 className="text-xl font-bold tracking-tight text-white mb-2">{template.name}</h3>
        <p className="text-sm leading-relaxed text-gray-400">
          {template.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${TAG_COLORS[tag] ?? "bg-white/5 text-gray-300 border border-white/10"}`}
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="mt-4 text-xs font-medium text-gray-500 flex items-center gap-2">
          <span>{template.nodes.length} nodes</span>
          <span className="h-1 w-1 rounded-full bg-gray-600"></span>
          <span>{template.edges.length} connections</span>
        </p>

        <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex-1 rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white active:scale-[0.98]"
          >
            {showPreview ? "Hide Preview" : "Preview DAG"}
          </button>
          <button
            onClick={handleUseTemplate}
            className="flex-1 relative overflow-hidden rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-purple-500 active:scale-[0.98] shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          >
            Use Template
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="h-64 border-t border-white/5 bg-black/20">
          <WorkflowCanvas
            nodes={template.nodes}
            edges={template.edges}
          />
        </div>
      )}
    </div>
  );
};

const TemplatesPage = () => {
  useEffect(() => {
    document.title = "FlowForge \u2014 Templates";
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      <NavHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex flex-col items-start">
          <h2 className="text-2xl font-bold tracking-tight text-white">Workflow Templates</h2>
          <p className="mt-1 text-sm text-gray-400">
            Pre-built workflows with real integration configurations.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.name} template={t} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default TemplatesPage;
