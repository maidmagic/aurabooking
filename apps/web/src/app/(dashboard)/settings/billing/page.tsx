"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, CreditCard } from "lucide-react";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string;
}

const PAYMENT_HISTORY = [
  { date: "May 15, 2026", amount: "$29.00", method: "Visa •••• 4242", status: "paid" },
  { date: "Apr 15, 2026", amount: "$29.00", method: "Visa •••• 4242", status: "paid" },
  { date: "Mar 15, 2026", amount: "$29.00", method: "Visa •••• 4242", status: "paid" },
];

export default function BillingSettingsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/billing")
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) setSubscription(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const planLabel = subscription?.plan ?? "Free";
  const statusLabel = subscription?.status ?? "active";
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Billing</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription and payment history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Current Plan</CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Plan</span>
            <span className="text-sm capitalize">{planLabel}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge variant={statusLabel === "active" ? "success" : "warning"}>
              {statusLabel}
            </Badge>
          </div>
          <Separator />
          {periodEnd && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current period ends</span>
                <span className="text-sm text-muted-foreground">{periodEnd}</span>
              </div>
              <Separator />
            </>
          )}
          <Button variant="outline" disabled>
            Manage Subscription
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
          <CardDescription>Recent payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PAYMENT_HISTORY.map((payment, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{payment.date}</p>
                  <p className="text-xs text-muted-foreground">{payment.method}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{payment.amount}</span>
                  <Badge variant="success">Paid</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
