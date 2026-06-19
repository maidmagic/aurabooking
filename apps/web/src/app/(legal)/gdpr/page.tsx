"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

export default function GDPRPage() {
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
      phone: form.get("phone") as string,
      name: form.get("name") as string,
      requestType: form.get("requestType") as string,
      details: form.get("details") as string,
    };

    try {
      const res = await fetch("/api/gdpr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit request");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center space-y-6">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="text-3xl font-semibold text-foreground">Request Submitted</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          We have received your data request. Our team will process it within 30 days
          and will contact you at the email address you provided if we need any additional information.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-sm leading-relaxed space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">Data Deletion Request</h1>
        <p className="text-muted-foreground">
          If you are a California resident (CCPA) or a resident of the European Economic
          Area (GDPR), you have the right to request deletion of your personal data.
          Fill out the form below and we will process your request within 30 days.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">Your Rights</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li><strong>Right to Access:</strong> Request a copy of the data we hold about you.</li>
          <li><strong>Right to Deletion:</strong> Request deletion of your personal data.</li>
          <li><strong>Right to Rectification:</strong> Request correction of inaccurate data.</li>
          <li><strong>Right to Portability:</strong> Receive your data in a portable format.</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label htmlFor="requestType">Request Type</Label>
          <select
            id="requestType"
            name="requestType"
            required
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          >
            <option value="deletion">Data Deletion</option>
            <option value="access">Data Access Request</option>
            <option value="rectification">Data Correction</option>
            <option value="portability">Data Portability</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" name="name" required placeholder="John Doe" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" name="email" type="email" required placeholder="john@example.com" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number (optional)</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+1234567890" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="details">Additional Details</Label>
          <Textarea
            id="details"
            name="details"
            rows={4}
            placeholder="Please provide any additional information that will help us locate your data..."
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Submitting..." : "Submit Request"}
        </Button>

        <p className="text-xs text-muted-foreground/60">
          By submitting this form, you acknowledge that we may need to verify your identity
          before processing your request. We will respond within 30 days as required by law.
        </p>
      </form>
    </div>
  );
}
