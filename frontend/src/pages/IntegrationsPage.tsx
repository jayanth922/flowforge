import { useState, useEffect, useCallback } from "react";
import NavHeader from "../components/NavHeader";
import {
  listIntegrations,
  createIntegration,
  deleteIntegration,
  testIntegration,
  type IntegrationSummary,
} from "../services/api";

type ServiceType = "slack" | "discord" | "github" | "http";

interface ServiceConfig {
  label: string;
  icon: string;
  description: string;
  fields: { key: string; label: string; type: "text" | "url" | "password" | "textarea" }[];
}

const SERVICES: Record<ServiceType, ServiceConfig> = {
  slack: {
    label: "Slack",
    icon: "#",
    description: "Send messages to Slack channels via webhooks",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "url" },
    ],
  },
  discord: {
    label: "Discord",
    icon: "D",
    description: "Send messages to Discord channels via webhooks",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "url" },
    ],
  },
  github: {
    label: "GitHub",
    icon: "G",
    description: "Create issues and interact with GitHub repositories",
    fields: [
      { key: "token", label: "Personal Access Token", type: "password" },
      { key: "owner", label: "Owner / Org", type: "text" },
      { key: "repo", label: "Repository", type: "text" },
    ],
  },
  http: {
    label: "HTTP",
    icon: "H",
    description: "Custom HTTP requests with pre-configured headers",
    fields: [
      { key: "headers", label: "Headers (JSON)", type: "textarea" },
    ],
  },
};

const SERVICE_ORDER: ServiceType[] = ["slack", "discord", "github", "http"];

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedService, setExpandedService] = useState<ServiceType | null>(null);

  useEffect(() => {
    document.title = "FlowForge — Integrations";
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await listIntegrations();
      setIntegrations(data);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byService = (service: ServiceType) =>
    integrations.filter((i) => i.service === service);

  const handleDelete = async (id: string) => {
    try {
      await deleteIntegration(id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
    } catch {
      /* swallow */
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-bold">Connected Integrations</h1>
        <p className="mb-8 text-sm text-gray-400">
          Connect your third-party services to use them in workflow nodes.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {SERVICE_ORDER.map((service) => {
              const cfg = SERVICES[service];
              const items = byService(service);
              return (
                <ServiceSection
                  key={service}
                  service={service}
                  config={cfg}
                  items={items}
                  expanded={expandedService === service}
                  onToggle={() =>
                    setExpandedService((prev) =>
                      prev === service ? null : service,
                    )
                  }
                  onDelete={handleDelete}
                  onCreated={() => void load()}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

interface ServiceSectionProps {
  service: ServiceType;
  config: ServiceConfig;
  items: IntegrationSummary[];
  expanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onCreated: () => void;
}

const ServiceSection = ({
  service,
  config,
  items,
  expanded,
  onToggle,
  onDelete,
  onCreated,
}: ServiceSectionProps) => {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-800 text-sm font-bold text-gray-300">
            {config.icon}
          </div>
          <div>
            <h3 className="font-semibold">{config.label}</h3>
            <p className="text-xs text-gray-500">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {items.length} connected
          </span>
          <button
            onClick={onToggle}
            className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
          >
            {expanded ? "Cancel" : "+ Add Connection"}
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="border-t border-gray-800 px-5 py-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2"
            >
              <div>
                <span className="text-sm font-medium">{item.name}</span>
                <span className="ml-3 text-xs text-gray-500">
                  Added {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={() => onDelete(item.id)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <AddForm service={service} config={config} onCreated={onCreated} onClose={onToggle} />
      )}
    </div>
  );
};

interface AddFormProps {
  service: ServiceType;
  config: ServiceConfig;
  onCreated: () => void;
  onClose: () => void;
}

const AddForm = ({ service, config, onCreated, onClose }: AddFormProps) => {
  const [name, setName] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildCredentials = (): Record<string, unknown> => {
    if (service === "http") {
      try {
        return { headers: JSON.parse(fields["headers"] ?? "{}") };
      } catch {
        return { headers: {} };
      }
    }
    return { ...fields };
  };

  const handleTest = async () => {
    if (service === "http") return;
    setTesting(true);
    setTestResult(null);
    try {
      const creds = buildCredentials();
      const result = await testIntegration(service, creds);
      setTestResult({
        success: result.success,
        message: result.message ?? result.error ?? "Unknown result",
      });
    } catch {
      setTestResult({ success: false, message: "Connection test failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createIntegration(service, name.trim(), buildCredentials());
      onCreated();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create integration";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-gray-800 px-5 py-4">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            Connection Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`My ${config.label}`}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
          />
        </div>

        {config.fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs text-gray-400">
              {f.label}
            </label>
            {f.type === "textarea" ? (
              <textarea
                value={fields[f.key] ?? ""}
                onChange={(e) =>
                  setFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                rows={3}
                placeholder={f.key === "headers" ? '{"Authorization": "Bearer ..."}' : ""}
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
              />
            ) : (
              <input
                type={f.type === "password" ? "password" : "text"}
                value={fields[f.key] ?? ""}
                onChange={(e) =>
                  setFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
                placeholder={f.type === "url" ? "https://..." : ""}
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
              />
            )}
          </div>
        ))}

        {testResult && (
          <div
            className={`rounded px-3 py-2 text-sm ${
              testResult.success
                ? "bg-green-900/30 text-green-400"
                : "bg-red-900/30 text-red-400"
            }`}
          >
            {testResult.success ? "\u2705" : "\u274c"} {testResult.message}
          </div>
        )}

        {error && (
          <div className="rounded bg-red-900/30 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          {service !== "http" && (
            <button
              onClick={() => void handleTest()}
              disabled={testing}
              className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white disabled:opacity-50"
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
          )}
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Integration"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
