"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Star } from "lucide-react";

interface ReviewSettings {
  enabled: boolean;
  business_name: string;
  google_review_url: string;
  feedback_gate_enabled: boolean;
  initial_delay_minutes: number;
  follow_up_delay_minutes: number;
}

const DEFAULT_SETTINGS: ReviewSettings = {
  enabled: false,
  business_name: "",
  google_review_url: "",
  feedback_gate_enabled: true,
  initial_delay_minutes: 120,
  follow_up_delay_minutes: 1440,
};

export default function ReviewSettingsPage() {
  const [settings, setSettings] = useState<ReviewSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/reviews/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) {
          setSettings({
            enabled: data.enabled ?? false,
            business_name: data.business_name ?? "",
            google_review_url: data.google_review_url ?? "",
            feedback_gate_enabled: data.feedback_gate_enabled ?? true,
            initial_delay_minutes: data.initial_delay_minutes ?? 120,
            follow_up_delay_minutes: data.follow_up_delay_minutes ?? 1440,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/reviews/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Review Requests</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Automate Google Review requests after appointments via SMS.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Review Settings</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable review requests</Label>
              <p className="text-xs text-muted-foreground">
                Automatically send SMS review requests after appointments.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enabled: checked })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="business_name">Business name</Label>
            <p className="text-xs text-muted-foreground">
              Used in SMS templates.
            </p>
            <Input
              id="business_name"
              value={settings.business_name}
              onChange={(e) =>
                setSettings({ ...settings, business_name: e.target.value })
              }
              placeholder="e.g. Downtown Dental"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="google_review_url">Google Review URL</Label>
            <p className="text-xs text-muted-foreground">
              Where customers are redirected to leave a review.
            </p>
            <Input
              id="google_review_url"
              value={settings.google_review_url}
              onChange={(e) =>
                setSettings({ ...settings, google_review_url: e.target.value })
              }
              placeholder="https://g.page/r/..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Feedback gate</Label>
              <p className="text-xs text-muted-foreground">
                Ask for a star rating before showing the review link.
              </p>
            </div>
            <Switch
              checked={settings.feedback_gate_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, feedback_gate_enabled: checked })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="initial_delay">Initial delay (minutes)</Label>
              <p className="text-xs text-muted-foreground">
                Wait time after appointment completes.
              </p>
              <Input
                id="initial_delay"
                type="number"
                min={0}
                value={settings.initial_delay_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    initial_delay_minutes: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="follow_up_delay">Follow-up delay (minutes)</Label>
              <p className="text-xs text-muted-foreground">
                Wait time after initial SMS if no reply.
              </p>
              <Input
                id="follow_up_delay"
                type="number"
                min={0}
                value={settings.follow_up_delay_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    follow_up_delay_minutes: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
            {saved && <span className="text-sm text-[#4A7C59]">Saved!</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>Appointment is marked <strong>completed</strong></li>
            <li>
              After the <strong>initial delay</strong> (default: 2 hours), an
              SMS asks for a star rating (1&ndash;5)
            </li>
            <li>
              If <strong>feedback gate</strong> is enabled, the customer&apos;s
              reply decides the next step
            </li>
            <li>
              Ratings 4&ndash;5 &rarr; receive a branded link to leave a Google
              review
            </li>
            <li>
              Ratings 1&ndash;3 &rarr; receive a private feedback form so you
              can resolve issues before they hit Google
            </li>
            <li>
              If no reply within the <strong>follow-up delay</strong> (default:
              24 hours), a second SMS is sent
            </li>
          </ol>

          <div className="border-t border-[#EDE9E3] pt-3 mt-3 space-y-3">
            <div>
              <p className="font-medium text-foreground text-xs uppercase tracking-wider mb-1.5">
                Branded short URLs
              </p>
              <p>
                Review links use your <code className="text-xs bg-[#EDE9E3] px-1 rounded">SHORT_DOMAIN</code>{" "}
                environment variable (e.g., <code className="text-xs bg-[#EDE9E3] px-1 rounded">https://aura.bo</code>).
                Set this in your deployment for clean, trusted links.
              </p>
            </div>

            <div>
              <p className="font-medium text-foreground text-xs uppercase tracking-wider mb-1.5">
                Cron jobs required
              </p>
              <p>
                This feature requires two cron jobs:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>
                  <code className="text-xs bg-[#EDE9E3] px-1 rounded">send-review-requests</code>
                  &nbsp;&mdash; sends the initial SMS after the delay
                </li>
                <li>
                  <code className="text-xs bg-[#EDE9E3] px-1 rounded">send-review-followups</code>
                  &nbsp;&mdash; sends a follow-up SMS if no reply
                </li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-foreground text-xs uppercase tracking-wider mb-1.5">
                Timing
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Peak conversion:</strong> 2 hours after service completed</li>
                <li><strong>Secondary attempt:</strong> 24 hours later if no response</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
