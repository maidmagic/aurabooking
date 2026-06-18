"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Save, Send, Calendar } from "lucide-react";

export default function NewCampaignPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("reminder");
  const [audience, setAudience] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [schedule, setSchedule] = useState("");

  const charCount = messageTemplate.length;

  const handleSubmit = async (status: string) => {
    setSubmitting(true);
    let parsedAudience: Record<string, unknown> = {};
    try {
      parsedAudience = audience ? JSON.parse(audience) : {};
    } catch {
      parsedAudience = { raw: audience };
    }

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        audience: parsedAudience,
        message_template: messageTemplate,
        schedule: schedule || null,
        status,
      }),
    });

    if (res.ok) {
      router.push("/campaigns");
    } else {
      const err = await res.json();
      alert(err.error ?? "Failed to create campaign");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push("/campaigns")}
      >
        <ArrowLeft className="size-4" />
        Back to Campaigns
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>New Campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Sale Reminder"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="promotion">Promotion</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience">Audience (JSON)</Label>
            <Textarea
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder='{"filter": "all"} or {"tag": "returning"}'
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message Template</Label>
            <Textarea
              id="message"
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="Hi {{name}}, this is a reminder for your appointment..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground text-right">{charCount} characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule</Label>
            <Input
              id="schedule"
              type="datetime-local"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="gap-2 justify-end">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => handleSubmit("draft")}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save as Draft
          </Button>
          <Button
            disabled={submitting}
            onClick={() => handleSubmit("scheduled")}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Calendar className="size-4" />}
            Schedule
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
