"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle, Loader2, Copy, RefreshCw, Webhook, Database, Brain, CreditCard, PhoneCall, Zap } from "lucide-react";

interface HealthData {
  checks: Record<string, boolean>;
  timestamp: string;
}

interface WebhookConfig {
  webhook_url: string;
  has_key: boolean;
  enabled: boolean;
}

const SERVICE_LABELS: Record<string, { label: string; icon: any }> = {
  supabase: { label: "Supabase", icon: Database },
  twilio: { label: "Twilio SMS", icon: PhoneCall },
  stripe: { label: "Stripe", icon: CreditCard },
  openrouter: { label: "OpenRouter AI", icon: Brain },
  cron: { label: "Cron Jobs", icon: RefreshCw },
};

export default function ConnectionsPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [webhook, setWebhook] = useState<WebhookConfig | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(true);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchHealth = () => {
    setHealthLoading(true);
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .finally(() => setHealthLoading(false));
  };

  const fetchWebhook = () => {
    setWebhookLoading(true);
    fetch("/api/integrations/webhook-config")
      .then((r) => r.json())
      .then(setWebhook)
      .finally(() => setWebhookLoading(false));
  };

  useEffect(() => { fetchHealth(); fetchWebhook(); }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setNewKey(null);
    try {
      const res = await fetch("/api/integrations/webhook-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      });
      const data = await res.json();
      if (data.api_key) setNewKey(data.api_key);
      fetchWebhook();
    } finally {
      setRegenerating(false);
    }
  };

  const handleToggleWebhook = async (enabled: boolean) => {
    await fetch("/api/integrations/webhook-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setWebhook((prev) => prev ? { ...prev, enabled } : null);
  };

  const handleCopyUrl = async () => {
    if (webhook?.webhook_url) {
      await navigator.clipboard.writeText(webhook.webhook_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Connections</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor integration health and configure webhook access for external platforms.
        </p>
      </div>

      {/* Service Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading && !health ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(SERVICE_LABELS).map(([key, { label, icon: Icon }]) => {
                const ok = health?.checks?.[key];
                return (
                  <div key={key} className="flex items-center justify-between p-4 rounded-lg border border-[#EDE9E3] bg-white">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${ok ? "bg-[#4A7C59]/10" : "bg-[#C44E4E]/10"}`}>
                        <Icon className={`h-4 w-4 ${ok ? "text-[#4A7C59]" : "text-[#C44E4E]"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <Badge variant={ok ? "success" : "destructive"} className="text-[10px] mt-0.5">
                          {ok ? "Connected" : "Disconnected"}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={fetchHealth} disabled={healthLoading}>
                      <RefreshCw className={`size-3.5 ${healthLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {health && (
            <p className="text-[10px] text-muted-foreground mt-3">
              Last checked: {new Date(health.timestamp).toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="size-4 text-muted-foreground" />
            Webhook Lead Receiver
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {webhookLoading && !webhook ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : webhook ? (
            <>
              {/* Webhook URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-[#FAF8F5] border border-[#EDE9E3] rounded-lg px-3 py-2 text-foreground truncate font-mono">
                    {webhook.webhook_url}
                  </code>
                  <Button variant="outline" size="icon-sm" onClick={handleCopyUrl}>
                    {copied ? <CheckCircle2 className="size-3.5 text-[#4A7C59]" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
              </div>

              {/* API Key Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">API Key</p>
                  <Badge variant={webhook.has_key ? "success" : "warning"} className="text-[10px]">
                    {webhook.has_key ? "Configured" : "Not configured"}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
                  {regenerating ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <RefreshCw className="size-3.5 mr-1.5" />}
                  Regenerate Key
                </Button>
              </div>

              {/* New key display */}
              {newKey && (
                <div className="bg-[#D97706]/5 border border-[#D97706]/20 rounded-lg p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <Zap className="size-4 text-[#D97706] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#D97706]">New API Key Generated</p>
                      <code className="block text-xs bg-white border border-[#EDE9E3] rounded px-3 py-2 mt-1.5 font-mono text-foreground select-all">
                        {newKey}
                      </code>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Save this key — it won&apos;t be shown again. Use it as the <code className="text-xs bg-[#EDE9E3] px-1 rounded">X-Api-Key</code> header when sending leads to the webhook URL.
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => { navigator.clipboard.writeText(newKey); setCopied(true); }}>
                    <Copy className="size-3.5 mr-1.5" />
                    Copy Key
                  </Button>
                </div>
              )}

              {/* Enable toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-[#EDE9E3]">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Accept incoming leads</p>
                  <p className="text-xs text-muted-foreground">
                    When enabled, external platforms can send leads to this webhook URL.
                  </p>
                </div>
                <Switch checked={webhook.enabled} onCheckedChange={handleToggleWebhook} />
              </div>

              {/* Quick Start */}
              <div className="pt-2 border-t border-[#EDE9E3] space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Start</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#FAF8F5] rounded-lg p-3 border border-[#EDE9E3]">
                    <p className="text-xs font-medium text-foreground mb-1">Zapier</p>
                    <p className="text-[10px] text-muted-foreground">Use Webhooks by Zapier — POST your form data as JSON to the webhook URL.</p>
                  </div>
                  <div className="bg-[#FAF8F5] rounded-lg p-3 border border-[#EDE9E3]">
                    <p className="text-xs font-medium text-foreground mb-1">Gravity Forms</p>
                    <p className="text-[10px] text-muted-foreground">Use the Webhook add-on with POST request format. Maps form fields to JSON body.</p>
                  </div>
                  <div className="bg-[#FAF8F5] rounded-lg p-3 border border-[#EDE9E3]">
                    <p className="text-xs font-medium text-foreground mb-1">Unbounce</p>
                    <p className="text-[10px] text-muted-foreground">Add a webhook JavaScript snippet to your Thank You page or use Zapier.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Failed to load webhook configuration.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
