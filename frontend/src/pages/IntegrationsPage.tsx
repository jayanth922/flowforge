import { useState, useEffect, useCallback } from "react";
import NavHeader from "../components/NavHeader";
import {
  listIntegrations,
  createIntegration,
  deleteIntegration,
  type IntegrationSummary,
} from "../services/api";

type ConnectServiceType = "slack" | "discord" | "github";

const CONNECT_SERVICES: { service: ConnectServiceType; label: string; desc: string; icon: string; brandClass: string }[] = [
  {
    service: "slack",
    label: "Slack",
    desc: "Send notifications and automatic alerts to your workspace channels.",
    icon: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/slack.svg",
    brandClass: "group-hover:shadow-purple-500/20 shadow-purple-500/0"
  },
  {
    service: "discord",
    label: "Discord",
    desc: "Trigger webhooks to post rich embedded messages into Discord servers.",
    icon: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/discord.svg",
    brandClass: "group-hover:shadow-indigo-500/20 shadow-indigo-500/0"
  },
  {
    service: "github",
    label: "GitHub",
    desc: "Create issues, comments, or trigger actions in any GitHub repository.",
    icon: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/github.svg",
    brandClass: "group-hover:shadow-gray-400/20 shadow-gray-400/0"
  },
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
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-purple-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CONNECT_SERVICES.map(({ service, label, desc, icon, brandClass }) => {
              const items = byService(service);
              return (
                <div
                  key={service}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/5 bg-gray-900/40 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:bg-gray-800/60 shadow-lg ${brandClass}`}
                >
                  <div className="mb-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/10 transition-transform duration-300 group-hover:scale-110">
                        <img src={icon} alt={label} className="h-6 w-6 opacity-80 filter invert" />
                      </div>
                      {items.length > 0 && (
                        <div className="flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-green-400">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                          </span>
                          Active
                        </div>
                      )}
                    </div>
                    <h3 className="mb-2 text-lg font-bold tracking-tight text-white">{label}</h3>
                    <p className="text-sm leading-relaxed text-gray-400">{desc}</p>
                  </div>

                  <div className="mt-auto flex flex-col gap-3">
                    {items.length > 0 && (
                      <div className="mb-2 flex flex-col gap-2 rounded-lg border border-white/5 bg-black/20 p-3">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between"
                          >
                            <span className="truncate text-xs font-medium text-gray-300" title={item.name}>
                              {item.name}
                            </span>
                            <button
                              onClick={() => handleDisconnect(item.id)}
                              className="ml-2 text-[10px] font-semibold text-red-500 transition-colors hover:text-red-400"
                            >
                              DISCONNECT
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setConnectModal(service)}
                      className="w-full rounded-lg bg-white/5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-[0.98]"
                    >
                      {items.length > 0 ? "+ Add Another" : "Connect"}
                    </button>
                  </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900/90 p-8 shadow-2xl backdrop-blur-md">
        <h3 className="mb-6 text-xl font-bold tracking-tight text-white">{labels[service]}</h3>

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

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-transparent px-5 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="relative overflow-hidden rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-purple-500 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Connection"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
