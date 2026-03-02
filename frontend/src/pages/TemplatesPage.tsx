import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Payments: "bg-yellow-100 text-yellow-800",
  Slack: "bg-emerald-100 text-emerald-800",
  GitHub: "bg-gray-100 text-gray-800",
  Email: "bg-green-100 text-green-800",
  Discord: "bg-indigo-100 text-indigo-800",
  API: "bg-cyan-100 text-cyan-800",
  Schedule: "bg-orange-100 text-orange-800",
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
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-md">
      <div className="p-6">
        <h3 className="text-xl font-bold tracking-tight text-gray-900 mb-2">{template.name}</h3>
        <p className="text-sm leading-relaxed text-gray-500 font-medium">
          {template.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${TAG_COLORS[tag] ?? "bg-gray-100 text-gray-800"}`}
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="mt-4 text-xs font-medium text-gray-400 flex items-center gap-2">
          <span>{template.nodes.length} nodes</span>
          <span className="h-1 w-1 rounded-full bg-gray-300"></span>
          <span>{template.edges.length} connections</span>
        </p>

        <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 active:scale-[0.98]"
          >
            {showPreview ? "Hide Preview" : "Preview DAG"}
          </button>
          <button
            onClick={handleUseTemplate}
            className="flex-1 relative overflow-hidden rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-[0.98] shadow-sm"
          >
            Use Template
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="h-64 border-t border-gray-200 bg-gray-50">
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
    <div className="mx-auto max-w-6xl w-full p-6 md:p-8">
      <main>
        <div className="mb-8 flex flex-col items-start">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Workflow Templates</h2>
          <p className="mt-1 text-sm font-medium text-gray-500">
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
