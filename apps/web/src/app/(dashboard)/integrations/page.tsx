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
