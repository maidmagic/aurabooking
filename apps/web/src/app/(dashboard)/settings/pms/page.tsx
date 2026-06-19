"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Plug, TestTube, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface FieldDef {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

interface PMSProvider {
  name: string;
  description: string;
  fields: FieldDef[];
}

interface PMSConnection {
  id: string;
  provider: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  config_masked: Record<string, string>;
}

interface PMSData {
  providers: Record<string, PMSProvider>;
  connection: PMSConnection | null;
}

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  opendental: "Connect to your OpenDental self-hosted or cloud instance for real-time appointment sync.",
  eaglesoft: "Integrate with Patterson Dental's Eaglesoft. Coming soon.",
  dentrix: "Integrate with Henry Schein's Dentrix. Coming soon.",
};

export default function PMSSettingsPage() {
  const [data, setData] = useState<PMSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pms");
      if (!res.ok) throw new Error("Failed to fetch PMS data");
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const connection = data?.connection;
  const providers = data?.providers ?? {};

  const handleProviderSelect = (key: string) => {
    setSelectedProvider(key);
    setFormValues({});
    setTestResult(null);
  };

  const handleFormChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/pms/test", { method: "POST" });
      setTestResult(await res.json());
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProvider) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, config: formValues }),
      });
      if (!res.ok) throw new Error("Failed to save");
      await fetchData();
      setSelectedProvider(null);
      setFormValues({});
      setTestResult(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (active: boolean) => {
    setSaving(true);
    try {
      const res = await fetch("/api/pms/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/pms", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">PMS / EHR Integration</h2>
          <p className="text-sm text-muted-foreground mt-1">Connect your practice management software for real-time booking and patient sync.</p>
        </div>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const renderProviderGrid = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Choose Your PMS Provider</CardTitle>
        <CardDescription>Select your practice management software to connect.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(providers).map(([key, provider]) => {
            const isSelected = selectedProvider === key;
            const isComingSoon = provider.fields.length === 0;
            return (
              <button
                key={key}
                onClick={() => !isComingSoon && handleProviderSelect(key)}
                disabled={isComingSoon}
                className={`text-left p-5 rounded-xl border-2 transition-all ${
                  isComingSoon
                    ? "border-[#EDE9E3] opacity-50 cursor-not-allowed"
                    : isSelected
                      ? "border-[#4A7C59] bg-[#4A7C59]/5"
                      : "border-[#EDE9E3] hover:border-[#D97706] hover:bg-[#FAF8F5]"
                }`}
              >
                <h3 className="font-semibold text-foreground">{provider.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {PROVIDER_DESCRIPTIONS[key] ?? provider.description}
                </p>
                <div className="mt-2">
                  {isComingSoon && <Badge variant="warning">Coming Soon</Badge>}
                  {isSelected && <Badge variant="success">Selected</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderConnectionForm = () => {
    const provider = selectedProvider ? providers[selectedProvider] : null;
    if (!provider) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plug className="size-4 text-muted-foreground" />
            Connect to {provider.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {provider.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type={field.type}
                value={formValues[field.key] ?? ""}
                onChange={(e) => handleFormChange(field.key, e.target.value)}
                placeholder={`Enter ${provider.name} ${field.label.toLowerCase()}`}
                className="border-[#EDE9E3] bg-white"
              />
            </div>
          ))}

          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              testResult.ok ? "bg-[#4A7C59]/10 text-[#4A7C59]" : "bg-[#C44E4E]/10 text-[#C44E4E]"
            }`}>
              {testResult.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              {testResult.message}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              {testing ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <TestTube className="size-4 mr-1.5" />}
              Test Connection
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Save Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderConnected = () => {
    if (!connection) return null;
    const providerName = providers[connection.provider]?.name ?? connection.provider;

    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plug className="size-4 text-muted-foreground" />
              Connected PMS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                  connection.is_active ? "bg-[#4A7C59]/10" : "bg-[#D97706]/10"
                }`}>
                  <Plug className={`h-4 w-4 ${connection.is_active ? "text-[#4A7C59]" : "text-[#D97706]"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{providerName}</p>
                  <Badge variant={connection.is_active ? "success" : "warning"} className="text-[10px] mt-0.5">
                    {connection.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-[#FAF8F5] border border-[#EDE9E3] rounded-lg p-4 space-y-2">
              {Object.entries(connection.config_masked).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                  <code className="text-xs font-mono text-foreground">{value || "—"}</code>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Connected {new Date(connection.created_at).toLocaleDateString()}</span>
              {connection.last_sync_at && (
                <span>Last synced {new Date(connection.last_sync_at).toLocaleDateString()}</span>
              )}
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                testResult.ok ? "bg-[#4A7C59]/10 text-[#4A7C59]" : "bg-[#C44E4E]/10 text-[#C44E4E]"
              }`}>
                {testResult.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                {testResult.message}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#EDE9E3]">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Active Integration</p>
                <p className="text-xs text-muted-foreground">
                  When active, the AI assistant will use PMS data for scheduling.
                </p>
              </div>
              <Switch checked={connection.is_active} onCheckedChange={handleToggleActive} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                {testing ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <TestTube className="size-4 mr-1.5" />}
                Test Connection
              </Button>
              <Button variant="destructive" onClick={() => setDisconnectDialogOpen(true)} disabled={deleting}>
                {deleting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Trash2 className="size-4 mr-1.5" />}
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">PMS / EHR Integration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your practice management software for real-time booking and patient sync.
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 p-4 rounded-lg bg-[#C44E4E]/10 text-[#C44E4E] text-sm">
          <div className="flex items-center gap-2">
            <XCircle className="size-4 shrink-0" />
            {error}
          </div>
          <button onClick={() => setError(null)} className="hover:opacity-70">
            <X className="size-4" />
          </button>
        </div>
      )}

      {connection ? renderConnected() : (
        <>
          {renderProviderGrid()}
          {selectedProvider && renderConnectionForm()}
        </>
      )}

      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect PMS?</DialogTitle>
            <DialogDescription>
              This will remove your PMS connection and stop syncing appointments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDisconnectDialogOpen(false);
                handleDisconnect();
              }}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
