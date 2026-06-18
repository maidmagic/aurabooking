# Missed Call Text — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-send a customizable SMS to patients when a business misses their call.

**Architecture:** Twilio Voice webhook returns TwiML to forward calls to the business's real phone. When unanswered after 15s, Twilio fires a status callback — we catch it and send the SMS, creating a conversation in the inbox. Voice settings live in `integrations.metadata` JSONB.

**Tech stack:** Twilio SDK (Voice + SMS), Next.js route handlers, TwiML XML response, existing Supabase admin client

---

### Task 1: Update Twilio integration API to accept voice settings

**Files:**
- Modify: `apps/web/src/app/api/integrations/twilio/route.ts`

- [ ] **Read current file** to confirm structure

- [ ] **Update the POST handler** to accept and persist `forwardPhone`, `missedCallMessage`, `missedCallEnabled` in `integrations.metadata`

Edit `apps/web/src/app/api/integrations/twilio/route.ts` — change the POST handler body:

```typescript
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let twilioPhone: string;
  let forwardPhone: string | undefined;
  let missedCallMessage: string | undefined;
  let missedCallEnabled: boolean | undefined;
  try {
    const body = await request.json();
    twilioPhone = body.twilioPhone;
    forwardPhone = body.forwardPhone;
    missedCallMessage = body.missedCallMessage;
    missedCallEnabled = body.missedCallEnabled;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!twilioPhone || typeof twilioPhone !== "string") {
    return NextResponse.json({ error: "twilioPhone is required" }, { status: 400 });
  }

  const { error } = await supabase.from("integrations").upsert({
    user_id: user.id,
    provider: "twilio",
    twilio_phone: twilioPhone,
    metadata: {
      forward_phone: forwardPhone ?? "",
      missed_call_message: missedCallMessage ?? "We missed your call! Text us back and we'll help you out.",
      missed_call_enabled: missedCallEnabled ?? true,
    },
  }, { onConflict: "user_id,provider" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0

---

### Task 2: Create Twilio Voice incoming call webhook

**Files:**
- Create: `apps/web/src/app/api/webhooks/twilio/voice/route.ts`

- [ ] **Create the route file**

```typescript
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const formData = await request.formData();
  const to = formData.get("To") as string;

  if (!to) {
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Reject/></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("integrations")
    .select("metadata")
    .eq("twilio_phone", to)
    .single();

  const forwardPhone = integration?.metadata?.forward_phone as string | undefined;

  if (!forwardPhone) {
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Reject/></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const webhookBase = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get("host")}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="15" action="${webhookBase}/api/webhooks/twilio/voice-status">
    <Number>${forwardPhone}</Number>
  </Dial>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
```

- [ ] **Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0

---

### Task 3: Create Twilio Voice status callback (missed call handler)

**Files:**
- Create: `apps/web/src/app/api/webhooks/twilio/voice-status/route.ts`

- [ ] **Create the route file**

```typescript
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import twilio from "twilio";

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const dialCallStatus = formData.get("DialCallStatus") as string;
  const from = formData.get("From") as string;
  const to = formData.get("To") as string;

  if (dialCallStatus !== "no-answer" || !from || !to) {
    return NextResponse.json({});
  }

  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("integrations")
    .select("user_id, metadata")
    .eq("twilio_phone", to)
    .single();

  if (!integration) return NextResponse.json({});

  const userId = integration.user_id;
  const missedCallEnabled = integration.metadata?.missed_call_enabled;
  const missedCallMessage =
    (integration.metadata?.missed_call_message as string) ||
    "We missed your call! Text us back and we'll help you out.";

  if (missedCallEnabled === false) return NextResponse.json({});

  // Find or create conversation
  let { data: conversation } = await admin
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("customer_phone", from)
    .single();

  if (!conversation) {
    const { data: newConv } = await admin
      .from("conversations")
      .insert({
        user_id: userId,
        channel: "sms",
        customer_phone: from,
        status: "active",
      })
      .select()
      .single();
    conversation = newConv;
  }

  // Store the auto-text as a message
  await admin.from("messages").insert({
    conversation_id: conversation!.id,
    role: "ai",
    content: missedCallMessage,
    msg_type: "text",
  });

  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation!.id);

  // Send SMS
  try {
    const client = getTwilioClient();
    await client.messages.create({
      body: missedCallMessage,
      from: to,
      to: from,
    });
  } catch (err) {
    console.error("Failed to send missed call SMS:", err);
  }

  return NextResponse.json({});
}
```

- [ ] **Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0

---

### Task 4: Add voice settings UI to Twilio card

**Files:**
- Modify: `apps/web/src/components/integrations/twilio-card.tsx`
- Modify: `apps/web/src/app/(dashboard)/integrations/page.tsx`

- [ ] **Update TwilioCard component** to accept and render voice settings

Edit `apps/web/src/components/integrations/twilio-card.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageCircle, Phone, Loader2 } from "lucide-react";

interface VoiceSettings {
  forwardPhone: string;
  missedCallMessage: string;
  missedCallEnabled: boolean;
}

interface Props {
  connected: boolean;
  twilioPhone?: string;
  voiceSettings?: VoiceSettings;
  onSave: (phone: string, voice: VoiceSettings) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function TwilioCard({ connected, twilioPhone, voiceSettings, onSave, onDisconnect }: Props) {
  const [phone, setPhone] = useState(twilioPhone ?? "");
  const [forwardPhone, setForwardPhone] = useState(voiceSettings?.forwardPhone ?? "");
  const [missedCallMessage, setMissedCallMessage] = useState(
    voiceSettings?.missedCallMessage ?? "We missed your call! Text us back and we'll help you out."
  );
  const [missedCallEnabled, setMissedCallEnabled] = useState(voiceSettings?.missedCallEnabled ?? true);
  const [loading, setLoading] = useState(false);
  const [showVoice, setShowVoice] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await onSave(phone, { forwardPhone, missedCallMessage, missedCallEnabled });
    setLoading(false);
  };

  const handleDisconnect = async () => {
    setLoading(true);
    await onDisconnect();
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Twilio SMS</CardTitle>
              <CardDescription>Receive and send SMS messages</CardDescription>
            </div>
          </div>
          <Badge variant={connected ? "booked" : "default"}>
            {connected ? "Connected" : "Not connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Number: {twilioPhone}</p>

            <button
              onClick={() => setShowVoice(!showVoice)}
              className="flex items-center gap-2 text-sm text-[#7C5CFC] hover:underline"
            >
              <Phone className="h-4 w-4" />
              {showVoice ? "Hide" : "Configure"} Missed Call Text
            </button>

            {showVoice && (
              <div className="space-y-3 border border-[#EDE9E3] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Enable Missed Call Text</label>
                  <button
                    onClick={() => setMissedCallEnabled(!missedCallEnabled)}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                      missedCallEnabled ? "bg-[#4A7C59]" : "bg-[#EDE9E3]"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        missedCallEnabled ? "translate-x-[18px]" : "translate-x-[2px]"
                      )}
                    />
                  </button>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Forward calls to</label>
                  <Input
                    placeholder="+15551234567"
                    value={forwardPhone}
                    onChange={(e) => setForwardPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Missed call message</label>
                  <Textarea
                    placeholder="We missed your call! Text us back and we'll help you out."
                    value={missedCallMessage}
                    onChange={(e) => setMissedCallMessage(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
              <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button onClick={handleSave} disabled={loading || !phone}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Update IntegrationsPage** to pass voice settings to TwilioCard

Edit `apps/web/src/app/(dashboard)/integrations/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { GoogleCalendarCard } from "@/components/integrations/google-calendar-card";
import { TwilioCard } from "@/components/integrations/twilio-card";

interface Integration {
  id: string;
  provider: "google_calendar" | "twilio";
  twilio_phone?: string;
  metadata?: {
    forward_phone?: string;
    missed_call_message?: string;
    missed_call_enabled?: boolean;
  };
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    fetch("/api/integrations").then((r) => r.json()).then(setIntegrations);
  }, []);

  const googleConnected = integrations.some((i) => i.provider === "google_calendar");
  const twilio = integrations.find((i) => i.provider === "twilio");

  const handleDelete = async (id: string) => {
    await fetch("/api/integrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
  };

  const handleTwilioSave = async (phone: string, voice: { forwardPhone: string; missedCallMessage: string; missedCallEnabled: boolean }) => {
    const res = await fetch("/api/integrations/twilio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        twilioPhone: phone,
        forwardPhone: voice.forwardPhone,
        missedCallMessage: voice.missedCallMessage,
        missedCallEnabled: voice.missedCallEnabled,
      }),
    });
    if (res.ok) {
      setIntegrations((prev) => [
        ...prev.filter((i) => i.provider !== "twilio"),
        {
          id: "new",
          provider: "twilio",
          twilio_phone: phone,
          metadata: {
            forward_phone: voice.forwardPhone,
            missed_call_message: voice.missedCallMessage,
            missed_call_enabled: voice.missedCallEnabled,
          },
        },
      ]);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Integrations</h2>
      <div className="space-y-4 max-w-2xl">
        <GoogleCalendarCard
          connected={googleConnected}
          onDisconnect={async () => {
            const gc = integrations.find((i) => i.provider === "google_calendar");
            if (gc) await handleDelete(gc.id);
          }}
        />
        <TwilioCard
          connected={!!twilio}
          twilioPhone={twilio?.twilio_phone}
          voiceSettings={twilio?.metadata ? {
            forwardPhone: twilio.metadata.forward_phone ?? "",
            missedCallMessage: twilio.metadata.missed_call_message ?? "",
            missedCallEnabled: twilio.metadata.missed_call_enabled ?? true,
          } : undefined}
          onSave={handleTwilioSave}
          onDisconnect={async () => {
            if (twilio) await handleDelete(twilio.id);
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0

---

### Task 5: Full build verification

**Files:** (none)

- [ ] **Run production build**

Run: `cd apps/web && npm run build`
Expected: Compiles successfully, all routes listed, exit code 0
