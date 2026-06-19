"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bug, CheckCircle2 } from "lucide-react";

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body = {
      email: form.get("email") as string,
      subject: form.get("subject") as string,
      description: form.get("description") as string,
      pageUrl: window.location.href,
    };

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setTimeout(() => setSubmitted(false), 200); }}>
      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
        <Bug className="h-5 w-5 text-muted-foreground" />
        <span className="sr-only">Report a bug</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <DialogTitle>Thank You!</DialogTitle>
            <DialogDescription>
              Your feedback has been submitted. We&apos;ll review it and follow up if needed.
            </DialogDescription>
            <Button variant="outline" onClick={() => setOpen(false)} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report a Bug / Feedback</DialogTitle>
              <DialogDescription>
                Found something wrong? Have a suggestion? Let us know and we&apos;ll look into it.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="feedback-email">Your Email</Label>
                <Input id="feedback-email" name="email" type="email" required placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-subject">Subject</Label>
                <Input id="feedback-subject" name="subject" placeholder="e.g. Button not working" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-description">Description</Label>
                <Textarea
                  id="feedback-description"
                  name="description"
                  required
                  rows={4}
                  placeholder="Tell us what happened..."
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending..." : "Send Feedback"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
