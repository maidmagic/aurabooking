# Appointment Reminders — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-send SMS appointment reminders 24h before appointments with text-to-confirm/cancel.

**Architecture:** Vercel Cron Job runs every 5 min checking for appointments in ~24h. Sends Twilio SMS with a templated message. Patient replies "confirm" or "cancel" — parsed by existing Twilio webhook. Settings stored in new DB tables.

**Tech Stack:** Supabase (new migrations), Twilio SDK, Next.js route handlers, Vercel Cron Jobs

---

### Task 1: Database migration — reminders + reminder_settings tables

**Files:**
- Create: `supabase/migrations/00002_reminders.sql`

- [ ] **Create the migration file**

Write to `supabase/migrations/00002_reminders.sql`:

```sql
-- Reminder tracking
CREATE TABLE public.reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sent_at         TIMESTAMPTZ DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'confirmed', 'cancelled', 'no_response')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON public.reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own reminders"
  ON public.reminders FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_reminders_appointment ON public.reminders(appointment_id);
CREATE INDEX idx_reminders_status ON public.reminders(status);
CREATE INDEX idx_reminders_sent ON public.reminders(user_id, sent_at);

-- Reminder settings per business
CREATE TABLE public.reminder_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  enabled         BOOLEAN DEFAULT true,
  template        TEXT NOT NULL DEFAULT 'Hi {customer_name}, this is a reminder for your {service} appointment tomorrow at {start_time}. Reply CONFIRM or CANCEL.',
  remind_at_hours INTEGER DEFAULT 24,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminder_settings"
  ON public.reminder_settings FOR ALL
  USING (auth.uid() = user_id);

-- Auto-create reminder_settings on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_reminder_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.reminder_settings (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_user_created_reminder_settings
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_reminder_settings();
```

- [ ] **Verify the file was created**

Run: `Test-Path "supabase/migrations/00002_reminders.sql"` — should return True

---

### Task 2: Cron job endpoint — send reminders

**Files:**
- Create: `apps/web/src/app/api/cron/reminders/route.ts`

- [ ] **Create the cron route**

Write to `apps/web/src/app/api/cron/reminders/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import twilio from "twilio";

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()} at ${h}:${mins} ${ampm}`;
}

export async function GET(request: Request) {
  // Protect cron endpoint with CRON_SECRET
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const targetStart = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 55 * 60 * 1000); // ~23h55m from now
  const targetEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000); // ~24h05m from now

  // Find appointments starting in ~24h that haven't had a reminder sent
  const { data: appointments } = await admin
    .from("appointments")
    .select("id, user_id, customer_name, customer_phone, start_time, end_time, service_id, services(name)")
    .gte("start_time", targetStart.toISOString())
    .lte("start_time", targetEnd.toISOString())
    .in("status", ["confirmed", "booked"])
    .not("customer_phone", "is", null)
    .not("customer_phone", "eq", "");

  let sent = 0;

  for (const apt of (appointments ?? [])) {
    // Check if reminder already sent
    const { data: existing } = await admin
      .from("reminders")
      .select("id")
      .eq("appointment_id", apt.id)
      .maybeSingle();

    if (existing) continue;

    // Get reminder settings
    const { data: settings } = await admin
      .from("reminder_settings")
      .select("*")
      .eq("user_id", apt.user_id)
      .maybeSingle();

    if (!settings?.enabled) continue;

    // Get business name
    const { data: user } = await admin
      .from("users")
      .select("company_name")
      .eq("id", apt.user_id)
      .single();

    // Render template
    const serviceName = (apt as any).services?.name ?? "appointment";
    const companyName = user?.company_name ?? "our office";
    const message = settings.template
      .replace("{customer_name}", apt.customer_name)
      .replace("{service}", serviceName)
      .replace("{start_time}", formatDateTime(apt.start_time))
      .replace("{business_name}", companyName);

    // Get Twilio number for this business
    const { data: integration } = await admin
      .from("integrations")
      .select("twilio_phone")
      .eq("user_id", apt.user_id)
      .eq("provider", "twilio")
      .single();

    if (!integration?.twilio_phone) continue;

    try {
      const client = getTwilioClient();
      await client.messages.create({
        body: message,
        from: integration.twilio_phone,
        to: apt.customer_phone,
      });

      await admin.from("reminders").insert({
        appointment_id: apt.id,
        user_id: apt.user_id,
        status: "sent",
      });

      sent++;
    } catch (err) {
      console.error(`Failed to send reminder for appointment ${apt.id}:`, err);
    }
  }

  return NextResponse.json({ sent });
}

export const dynamic = "force-dynamic";
```

- [ ] **Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0

---

### Task 3: Update Twilio webhook to handle confirm/cancel replies

**Files:**
- Modify: `apps/web/src/app/api/webhooks/twilio/route.ts`

- [ ] **Read current webhook file**

Current file is at `apps/web/src/app/api/webhooks/twilio/route.ts`. After the existing SMS storage logic (the `await admin.from("conversations").update(...)` call), add confirm/cancel detection.

- [ ] **Add confirm/cancel handling**

After the existing conversation update (line with `.eq("id", conversation!.id)`), add:

```typescript
  // Check for reminder confirm/cancel
  const normalized = body.toLowerCase().trim().replace(/[^a-z]/g, "");
  if (normalized === "confirm" || normalized === "cancel") {
    const { data: latestReminder } = await admin
      .from("reminders")
      .select("id, appointment_id")
      .eq("user_id", userId)
      .in("status", ["sent"])
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestReminder) {
      if (normalized === "confirm") {
        await admin
          .from("reminders")
          .update({ status: "confirmed" })
          .eq("id", latestReminder.id);

        await admin
          .from("appointments")
          .update({ status: "confirmed" })
          .eq("id", latestReminder.appointment_id);
      } else {
        await admin
          .from("reminders")
          .update({ status: "cancelled" })
          .eq("id", latestReminder.id);

        await admin
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", latestReminder.appointment_id);

        // Send cancellation confirmation SMS
        try {
          const client = getTwilioClient();
          await client.messages.create({
            body: "Your appointment has been cancelled. Let us know if you'd like to reschedule!",
            from: to,
            to: from,
          });
        } catch (_) {}
      }
    }
  }
```

Also need to add the twilio import at the top of the file (already imported from the voice-status task, but check if the main webhook file has it):

If twilio is not imported at the top of this file, add:
```typescript
import twilio from "twilio";
```

And the getTwilioClient helper:
```typescript
function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}
```

- [ ] **Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0

---

### Task 4: Reminder settings page + sidebar

**Files:**
- Create: `apps/web/src/app/(dashboard)/settings/reminders/page.tsx`
- Modify: `apps/web/src/components/dashboard/sidebar.tsx`

- [ ] **Create settings reminders page**

Create directory `apps/web/src/app/(dashboard)/settings/reminders/` then write `page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
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
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [enabled, setEnabled] = useState(true);
  const [remindAtHours, setRemindAtHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/integrations/reminder-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setSettings(data);
          setTemplate(data.template ?? DEFAULT_TEMPLATE);
          setEnabled(data.enabled ?? true);
          setRemindAtHours(data.remind_at_hours ?? 24);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const insertVariable = (key: string) => {
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
  };

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

  // Preview
  const preview = template
    .replace("{customer_name}", "Jane Smith")
    .replace("{service}", "Teeth Cleaning")
    .replace("{start_time}", "Wed, Jun 18 at 10:00 AM")
    .replace("{business_name}", "Downtown Dental");

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
```

- [ ] **Create the reminder settings API endpoint**

Create `apps/web/src/app/api/integrations/reminder-settings/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("reminder_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json(data ?? {});
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const { error } = await supabase.from("reminder_settings").upsert({
    user_id: user.id,
    template: body.template,
    enabled: body.enabled,
    remind_at_hours: body.remindAtHours,
  }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Update sidebar**

Edit `apps/web/src/components/dashboard/sidebar.tsx` — add a "Reminders" nav item after "Appointments":

```typescript
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/appointments", label: "Appointments", icon: CalendarCheck },
  { href: "/settings/reminders", label: "Reminders", icon: Bell },
  { href: "/ai-config", label: "AI Config", icon: Bot },
  { href: "/campaigns", label: "Campaigns", icon: Calendar },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];
```

You'll also need to add `Bell` to the lucide-react import:
```typescript
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Calendar,
  CalendarCheck,
  Plug,
  Settings,
  Bell,
} from "lucide-react";
```

- [ ] **Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0

---

### Task 5: Full build verification

**Files:** (none)

- [ ] **Run production build**

Run: `cd apps/web && npm run build`
Expected: Compiles successfully, exit code 0
