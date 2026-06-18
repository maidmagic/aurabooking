# Text to Pay — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send SMS payment requests with Stripe Checkout links. Track payment status on appointments.

**Architecture:** "Send Payment Request" button on appointments page → API creates Stripe Checkout Session → SMS sent with link → Stripe webhook updates payment status.

**Tech Stack:** Stripe SDK, Twilio SDK, Supabase, Next.js route handlers

---

### Task 1: Database migration — payments table + appointment payment_status

**Files:**
- Create: `supabase/migrations/00003_payments.sql`

- [ ] **Create the migration file**

Write to `supabase/migrations/00003_payments.sql`:

```sql
-- Text to Pay
CREATE TABLE public.payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id        UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount                INTEGER NOT NULL,
  currency              TEXT DEFAULT 'usd',
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_session_id     TEXT,
  stripe_payment_intent TEXT,
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own payments"
  ON public.payments FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_payments_appointment ON public.payments(appointment_id);

ALTER TABLE public.appointments ADD COLUMN payment_status TEXT DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded'));
```

---

### Task 2: Stripe Checkout session API + SMS send

**Files:**
- Create: `apps/web/src/app/api/payments/create-session/route.ts`

Prerequisites: Need to install the `stripe` npm package.

- [ ] **Install stripe**

Run from `apps/web`: `npm install stripe`

- [ ] **Create the API route**

Create directory `apps/web/src/app/api/payments/create-session/` then write `route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import twilio from "twilio";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appointment_id } = await request.json();
  if (!appointment_id) {
    return NextResponse.json({ error: "appointment_id required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get appointment with service price
  const { data: appointment } = await admin
    .from("appointments")
    .select("id, customer_name, customer_phone, user_id, service_id, services(name, price), payment_status")
    .eq("id", appointment_id)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (appointment.payment_status === "paid") {
    return NextResponse.json({ error: "Already paid" }, { status: 400 });
  }

  const price = (appointment as any).services?.price;
  const serviceName = (appointment as any).services?.name ?? "appointment";
  const amount = price ? Math.round(Number(price) * 100) : 0;

  if (amount <= 0) {
    return NextResponse.json({ error: "No amount due" }, { status: 400 });
  }

  // Get Twilio number for this business
  const { data: integration } = await admin
    .from("integrations")
    .select("twilio_phone")
    .eq("user_id", user.id)
    .eq("provider", "twilio")
    .single();

  // Create Stripe Checkout Session
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: serviceName },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/appointments?paid=${appointment_id}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/appointments`,
    metadata: {
      appointment_id,
      user_id: user.id,
    },
  });

  // Create payment record
  const { data: payment } = await admin
    .from("payments")
    .insert({
      appointment_id,
      user_id: user.id,
      amount,
      stripe_session_id: checkoutSession.id,
      status: "pending",
    })
    .select()
    .single();

  // Update appointment payment_status to pending
  await admin
    .from("appointments")
    .update({ payment_status: "pending" })
    .eq("id", appointment_id);

  // Send SMS with payment link
  if (appointment.customer_phone && integration?.twilio_phone) {
    const message = `You have a balance of $${(amount / 100).toFixed(2)} for your ${serviceName}. Pay here: ${checkoutSession.url}`;
    try {
      const client = getTwilioClient();
      await client.messages.create({
        body: message,
        from: integration.twilio_phone,
        to: appointment.customer_phone,
      });
    } catch (err) {
      console.error("Failed to send payment SMS:", err);
    }
  }

  return NextResponse.json({ url: checkoutSession.url, payment_id: payment?.id });
}
```

- [ ] **Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0

---

### Task 3: Stripe webhook endpoint

**Files:**
- Create: `apps/web/src/app/api/webhooks/stripe/route.ts`

- [ ] **Create the webhook route**

Create directory `apps/web/src/app/api/webhooks/stripe/` then write `route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const appointmentId = session.metadata?.appointment_id;
    const userId = session.metadata?.user_id;

    if (appointmentId && userId) {
      const admin = createAdminClient();

      await admin
        .from("payments")
        .update({
          status: "paid",
          stripe_payment_intent: session.payment_intent as string,
          paid_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id);

      await admin
        .from("appointments")
        .update({ payment_status: "paid" })
        .eq("id", appointmentId);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const appointmentId = session.metadata?.appointment_id;

    if (appointmentId) {
      const admin = createAdminClient();
      await admin
        .from("payments")
        .update({ status: "failed" })
        .eq("stripe_session_id", session.id);

      await admin
        .from("appointments")
        .update({ payment_status: "unpaid" })
        .eq("id", appointmentId);
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0

---

### Task 4: Add payment button to Appointments page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/appointments/page.tsx`
- Modify: `apps/web/src/components/appointments/appointment-list.tsx`

- [ ] **Update AppointmentsPage** to add a `handleSendPayment` handler

Edit `apps/web/src/app/(dashboard)/appointments/page.tsx`:

Current content is:
```typescript
"use client";

import { useEffect, useState } from "react";
import { AppointmentList } from "@/components/appointments/appointment-list";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  start_time: string;
  end_time: string;
  status: string;
  services?: { name: string } | null;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    fetch("/api/appointments").then((r) => r.json()).then(setAppointments);
  }, []);

  const handleCancel = async (id: string) => {
    await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "cancelled" }),
    });
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Appointments</h2>
      <AppointmentList appointments={appointments} onCancel={handleCancel} />
    </div>
  );
}
```

Replace with:
```typescript
"use client";

import { useEffect, useState } from "react";
import { AppointmentList } from "@/components/appointments/appointment-list";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  start_time: string;
  end_time: string;
  status: string;
  payment_status?: string;
  services?: { name: string } | null;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    fetch("/api/appointments").then((r) => r.json()).then(setAppointments);
  }, []);

  const handleCancel = async (id: string) => {
    await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "cancelled" }),
    });
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
    );
  };

  const handleSendPayment = async (id: string) => {
    const res = await fetch("/api/payments/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment_id: id }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, "_blank");
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, payment_status: "pending" } : a))
      );
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Appointments</h2>
      <AppointmentList
        appointments={appointments}
        onCancel={handleCancel}
        onSendPayment={handleSendPayment}
      />
    </div>
  );
}
```

- [ ] **Update AppointmentList component** to show payment button

Edit `apps/web/src/components/appointments/appointment-list.tsx`:

Current content is:
```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  start_time: string;
  end_time: string;
  status: string;
  services?: { name: string } | null;
}

interface Props {
  appointments: Appointment[];
  onCancel: (id: string) => void;
}

const statusVariant: Record<string, "default" | "booked" | "destructive" | "warning"> = {
  confirmed: "booked",
  cancelled: "destructive",
  rescheduled: "warning",
  completed: "default",
};

export function AppointmentList({ appointments, onCancel }: Props) {
  if (appointments.length === 0) {
    return <p className="text-sm text-muted-foreground">No appointments yet</p>;
  }

  return (
    <div className="space-y-3">
      {appointments.map((apt) => (
        <div
          key={apt.id}
          className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
        >
          <div>
            <p className="font-medium text-foreground">{apt.customer_name}</p>
            <p className="text-sm text-muted-foreground">
              {apt.services?.name ?? "No service"} —{" "}
              {new Date(apt.start_time).toLocaleDateString()} at{" "}
              {new Date(apt.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[apt.status] ?? "default"}>{apt.status}</Badge>
            {apt.status === "confirmed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(apt.id)}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

Replace with:
```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  start_time: string;
  end_time: string;
  status: string;
  payment_status?: string;
  services?: { name: string } | null;
}

interface Props {
  appointments: Appointment[];
  onCancel: (id: string) => void;
  onSendPayment?: (id: string) => void;
}

const statusVariant: Record<string, "default" | "booked" | "destructive" | "warning" | "success"> = {
  confirmed: "booked",
  cancelled: "destructive",
  rescheduled: "warning",
  completed: "success",
};

export function AppointmentList({ appointments, onCancel, onSendPayment }: Props) {
  if (appointments.length === 0) {
    return <p className="text-sm text-muted-foreground">No appointments yet</p>;
  }

  return (
    <div className="space-y-3">
      {appointments.map((apt) => (
        <div
          key={apt.id}
          className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
        >
          <div>
            <p className="font-medium text-foreground">{apt.customer_name}</p>
            <p className="text-sm text-muted-foreground">
              {apt.services?.name ?? "No service"} —{" "}
              {new Date(apt.start_time).toLocaleDateString()} at{" "}
              {new Date(apt.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
            {apt.payment_status && (
              <p className="text-xs mt-1">
                Payment:{" "}
                <span className={
                  apt.payment_status === "paid" ? "text-[#4A7C59] font-medium" :
                  apt.payment_status === "pending" ? "text-[#D97706] font-medium" :
                  "text-muted-foreground"
                }>
                  {apt.payment_status}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[apt.status] ?? "default"}>{apt.status}</Badge>
            {apt.payment_status === "unpaid" && onSendPayment && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendPayment(apt.id)}
                className="gap-1.5"
              >
                <DollarSign className="h-3.5 w-3.5" />
                Send Payment
              </Button>
            )}
            {apt.status === "confirmed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(apt.id)}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Update appointments API** to return payment_status

The appointments API at `apps/web/src/app/api/appointments/route.ts` needs to include `payment_status` in its select. Read the current file first, then add `payment_status` to the select query.

- [ ] **Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit code 0

---

### Task 5: Full build verification

**Files:** (none)

- [ ] **Run production build**

Run: `cd apps/web && npm run build`
Expected: Compiles successfully, exit code 0
