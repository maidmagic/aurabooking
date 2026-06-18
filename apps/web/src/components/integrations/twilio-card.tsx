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
