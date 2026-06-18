"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2, Bell } from "lucide-react";

interface ReminderSettings {
  enabled: boolean;
  template: string;
  remind_at_hours: number;
}

const DEFAULT_TEMPLATE = "Hi {customer_name}, this is a reminder for your {service} appointment tomorrow at {start_time}. Reply CONFIRM or CANCEL.";

const VARIABLES = [
  { key: "{customer_name}", label: "Customer Name" },
  { key: "{service}", label: "Service" },
  { key: "{start_time}", label: "Appointment Time" },
  { key: "{business_name}", label: "Business Name" },
];

export default function ReminderSettingsPage() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [enabled, setEnabled] = useState(true);
  const [remindAtHours, setRemindAtHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    fetch("/api/integrations/reminder-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setTemplate(data.template ?? DEFAULT_TEMPLATE);
          setEnabled(data.enabled ?? true);
          setRemindAtHours(data.remind_at_hours ?? 24);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const insertVariable = useCallback((key: string) => {
    if (textareaRef) {
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const newVal = template.slice(0, start) + key + template.slice(end);
      setTemplate(newVal);
      setTimeout(() => {
        textareaRef.selectionStart = textareaRef.selectionEnd = start + key.length;
        textareaRef.focus();
      }, 0);
    }
  }, [textareaRef, template]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/integrations/reminder-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template, enabled, remindAtHours }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const preview = template
    .replace(/\{customer_name\}/g, "Jane Smith")
    .replace(/\{service\}/g, "Teeth Cleaning")
    .replace(/\{start_time\}/g, "Wed, Jun 18 at 10:00 AM")
    .replace(/\{business_name\}/g, "Downtown Dental");

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
        <h2 className="text-2xl font-semibold text-foreground">Appointment Reminders</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Auto-send SMS reminders before appointments. Patients can reply CONFIRM or CANCEL.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Reminder Settings</CardTitle>
              <CardDescription>Configure when and how reminders are sent</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable reminders</label>
            <button
              onClick={() => setEnabled(!enabled)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                enabled ? "bg-[#4A7C59]" : "bg-[#EDE9E3]"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  enabled ? "translate-x-[18px]" : "translate-x-[2px]"
                )}
              />
            </button>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Send before appointment (hours)</label>
            <Input
              type="number"
              min={1}
              max={168}
              value={remindAtHours}
              onChange={(e) => setRemindAtHours(Number(e.target.value))}
              className="w-32"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Message template</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VARIABLES.map((v) => (
                <button
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md hover:bg-secondary/80"
                >
                  {v.label}
                </button>
              ))}
            </div>
            <Textarea
              ref={setTextareaRef}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          {template && (
            <div className="border border-[#EDE9E3] rounded-lg p-4 bg-[#FAF8F5]">
              <p className="text-xs font-medium text-muted-foreground mb-1">Preview:</p>
              <p className="text-sm">{preview}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Settings
            </Button>
            {saved && <span className="text-sm text-[#4A7C59]">Saved!</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
