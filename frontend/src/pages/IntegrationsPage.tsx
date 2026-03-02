import { useState, useEffect, useCallback } from "react";
import {
  listIntegrations,
  createIntegration,
  deleteIntegration,
  type IntegrationSummary,
} from "../services/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-8 flex flex-col items-start">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-900">Integrations</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Connect your third-party services to use them in workflow nodes.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CONNECT_SERVICES.map(({ service, label, desc, icon }) => {
            const items = byService(service);
            const isConnected = items.length > 0;
            return (
              <Card
                key={service}
                className="flex flex-col overflow-hidden transition-all duration-200 shadow-sm hover:border-zinc-300 hover:shadow-md"
              >
                <CardHeader className="pb-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 border border-zinc-100 transition-transform duration-300 hover:scale-105">
                      <img src={icon} alt={label} className="h-6 w-6 opacity-80 grayscale" />
                    </div>
                    {isConnected && (
                      <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-green-700">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                        </span>
                        Active
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg">{label}</CardTitle>
                  <CardDescription className="text-sm font-medium text-muted-foreground">{desc}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1 pb-4">
                  {isConnected ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between"
                        >
                          <span className="truncate text-xs font-semibold text-zinc-700" title={item.name}>
                            {item.name}
                          </span>
                          <button
                            onClick={() => handleDisconnect(item.id)}
                            className="ml-2 text-[10px] font-bold text-red-500 transition-colors hover:text-red-700 uppercase tracking-widest"
                          >
                            Disconnect
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-0">
                  <Button
                    variant={isConnected ? "default" : "outline"}
                    className="w-full font-medium"
                    onClick={() => setConnectModal(service)}
                  >
                    {isConnected ? "+ Add Another" : "Connect"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-xl border-zinc-200">
        <CardHeader>
          <CardTitle className="text-xl tracking-tight">{labels[service]}</CardTitle>
          <CardDescription>Enter your credentials to link this service.</CardDescription>
        </CardHeader>

        <CardContent>
          {service === "github" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-500">
                  Personal Access Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-500">
                  Repository Owner (username or org)
                </label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="myorg or myusername"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-500">
                  Repository
                </label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="my-repo"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-colors"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-500">
                Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/... or https://discord.com/api/webhooks/..."
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-colors"
              />
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md bg-red-50 border border-red-100 px-3 py-2.5 text-sm font-medium text-red-600">
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving..." : "Save Connection"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default IntegrationsPage;
