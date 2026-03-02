import { useState, useEffect, useCallback } from "react";
import NavHeader from "../components/NavHeader";
import {
  listIntegrations,
  createIntegration,
  deleteIntegration,
  type IntegrationSummary,
} from "../services/api";

type ConnectServiceType = "slack" | "discord" | "github";

const CONNECT_SERVICES: { service: ConnectServiceType; label: string }[] = [
  { service: "slack", label: "Slack" },
  { service: "discord", label: "Discord" },
  { service: "github", label: "GitHub" },
];

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectModal, setConnectModal] = useState<ConnectServiceType | null>(null);

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

  const byService = (service: string) =>
    integrations.filter((i) => i.service === service);

  const handleDisconnect = async (id: string) => {
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
        <h1 className="mb-2 text-2xl font-bold">Integrations</h1>
        <p className="mb-8 text-sm text-gray-400">
          Connect your third-party services to use them in workflow nodes.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {CONNECT_SERVICES.map(({ service, label }) => {
              const items = byService(service);
              return (
                <div
                  key={service}
                  className="rounded-lg border border-gray-800 bg-gray-900 px-5 py-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{label}</h3>
                    <div className="flex items-center gap-3">
                      {items.length > 0 && (
                        <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400">
                          Connected ✓
                        </span>
                      )}
                      <button
                        onClick={() => setConnectModal(service)}
                        className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
                      >
                        Connect
                      </button>
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-gray-800 pt-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <span className="text-sm font-medium">{item.name}</span>
                            <span className="ml-3 text-xs text-gray-500">
                              Added {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDisconnect(item.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Disconnect
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {connectModal && (
        <ConnectModal
          service={connectModal}
          onClose={() => setConnectModal(null)}
          onSaved={() => {
            void load();
            setConnectModal(null);
          }}
        />
      )}
    </div>
  );
};

interface ConnectModalProps {
  service: ConnectServiceType;
  onClose: () => void;
  onSaved: () => void;
}

const ConnectModal = ({ service, onClose, onSaved }: ConnectModalProps) => {
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCredentials = (): Record<string, unknown> => {
    if (service === "github") {
      return { token: token.trim(), owner: owner.trim(), repo: repo.trim() };
    }
    return { webhookUrl: webhookUrl.trim() };
  };

  const handleSave = async () => {
    const creds = getCredentials();
    if (service === "github") {
      if (!(creds.token as string) || !(creds.owner as string) || !(creds.repo as string)) {
        setError("Token, Owner, and Repository are required");
        return;
      }
    } else {
      if (!(creds.webhookUrl as string)) {
        setError("Webhook URL is required");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await createIntegration(service, creds);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setSaving(false);
    }
  };

  const labels: Record<ConnectServiceType, string> = {
    slack: "Connect Slack",
    discord: "Connect Discord",
    github: "Connect GitHub",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">{labels[service]}</h3>

        {service === "github" ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Personal Access Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Repository Owner (username or org)
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="myorg or myusername"
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Repository
              </label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="my-repo"
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/... or https://discord.com/api/webhooks/..."
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
            />
          </div>
        )}

        {error && (
          <div className="mt-3 rounded bg-red-900/30 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
