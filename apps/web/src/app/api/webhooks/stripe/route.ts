import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emitEvent } from "@/lib/webhooks/emit";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency guard — atomic PK violation prevents double-processing
  const { error: insertError } = await admin
    .from("idempotent_events")
    .insert({ id: event.id });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, skipped: "duplicate" });
    }
    // Non-fatal: let it proceed if the table doesn't exist yet
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const appointmentId = session.metadata?.appointment_id;
    const subUserId = session.metadata?.user_id;
    const stripeSubscriptionId = session.subscription as string;

    // Trial → Active conversion
    if (subUserId && stripeSubscriptionId) {
      const planMap: Record<string, string> = {
        solo: "solo",
        growth: "growth",
        scale: "scale",
      };
      const priceLookup = typeof session.line_items === "undefined"
        ? null
        : await getStripe().checkout.sessions.listLineItems(session.id, { limit: 1 });
      const planKey = priceLookup?.data?.[0]?.price?.lookup_key || "solo";
      const plan = planMap[planKey] || "solo";

      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();

      const bookingLimits: Record<string, number> = { solo: 250, growth: 1000, scale: 3000 };
      const overageCosts: Record<string, number> = { solo: 0.25, growth: 0.15, scale: 0.10 };

      await admin
        .from("subscriptions")
        .update({
          plan,
          status: "active",
          stripe_subscription_id: stripeSubscriptionId,
          monthly_booking_limit: bookingLimits[plan] || 250,
          overage_cost_per_booking: overageCosts[plan] || 0.25,
          trial_sms_used: 0,
          trial_ai_cost_used_cents: 0,
        })
        .eq("user_id", subUserId);

      // Clear any cached suspension
      const { getStore } = await import("@/lib/distributed-store");
      await getStore().del(`tenant:suspended:${subUserId}`);

      // Re-activate user if they were inactive
      await admin.from("users").update({ is_active: true }).eq("id", subUserId);
    }

    if (appointmentId) {
      // Race-condition guard: skip if already confirmed
      const { data: existing } = await admin
        .from("appointments")
        .select("payment_status")
        .eq("id", appointmentId)
        .single();

      if (existing?.payment_status === "paid") {
        return NextResponse.json({ received: true, skipped: "already_paid" });
      }

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
        .update({ payment_status: "paid", payment_intent_id: session.payment_intent as string })
        .eq("id", appointmentId);

      const { data: appointment } = await admin
        .from("appointments")
        .select("user_id, customer_name, customer_phone, start_time, end_time, service_id, conversation_id")
        .eq("id", appointmentId)
        .single();

      if (appointment) {
        // Enqueue calendar sync via outbox (not direct API call)
        const { enqueueCalendarSync } = await import("@/lib/calendar-outbox");
        const serviceName = session.metadata?.service_name ?? "appointment";
        await enqueueCalendarSync({
          user_id: appointment.user_id,
          appointment_id: appointmentId,
          event_type: "create",
          summary: serviceName,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
        });

        if (appointment.conversation_id) {
          await admin.from("conversations").update({ status: "booked" }).eq("id", appointment.conversation_id);
        }

        emitEvent(appointment.user_id, "booking.created", {
          id: appointmentId,
          customer_name: appointment.customer_name,
          customer_phone: appointment.customer_phone,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          deposit_required: true,
          status: "confirmed",
        });

        emitEvent(appointment.user_id, "payment.completed", {
          id: session.payment_intent as string,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          customer_name: appointment.customer_name,
          appointment_id: appointmentId,
          status: "paid",
          paid_at: new Date().toISOString(),
        });
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const appointmentId = session.metadata?.appointment_id;

    if (appointmentId) {
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

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as any;
    const subUserId = sub.metadata?.user_id;

    if (sub.status === "past_due" || sub.status === "unpaid") {
      const query = admin.from("subscriptions").update({ status: "past_due" });
      if (subUserId) {
        await query.eq("user_id", subUserId);
        await admin.from("users").update({ is_active: false }).eq("id", subUserId);
        const { getStore } = await import("@/lib/distributed-store");
        await getStore().set(`tenant:suspended:${subUserId}`, "true", 300_000);
        emitEvent(subUserId, "subscription.past_due", {
          subscription_id: sub.id,
          status: sub.status,
        });
      } else {
        await query.eq("stripe_subscription_id", sub.id);
      }
    } else if (sub.status === "active") {
      const query = admin.from("subscriptions").update({ status: "active" });
      if (subUserId) {
        await query.eq("user_id", subUserId);
        await admin.from("users").update({ is_active: true }).eq("id", subUserId);
        const { getStore } = await import("@/lib/distributed-store");
        await getStore().del(`tenant:suspended:${subUserId}`);
      } else {
        await query.eq("stripe_subscription_id", sub.id);
      }
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as any;
    const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
    const userId = invoice.metadata?.user_id;

    if (subId && invoice.period_start && invoice.period_end) {
      await admin
        .from("subscriptions")
        .update({
          status: "active",
          current_period_start: new Date(invoice.period_start * 1000).toISOString(),
          current_period_end: new Date(invoice.period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subId);

      if (userId) {
        emitEvent(userId, "subscription.payment_succeeded", {
          subscription_id: subId,
          amount: invoice.total / 100,
          period_start: new Date(invoice.period_start * 1000).toISOString(),
          period_end: new Date(invoice.period_end * 1000).toISOString(),
        });
      }
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as any;
    const subId = typeof invoice.subscription === "string" ? invoice.subscription : null;
    const userId = invoice.metadata?.user_id;

    if (subId) {
      await admin
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("stripe_subscription_id", subId);

      if (userId) {
        emitEvent(userId, "subscription.payment_failed", {
          subscription_id: subId,
          amount: invoice.total / 100,
          attempt_count: invoice.attempt_count,
          next_attempt: invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000).toISOString()
            : null,
        });
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as any;
    const userId = sub.metadata?.user_id;

    if (userId || sub.id) {
      const q = admin.from("subscriptions").update({ status: "canceled" });
      if (userId) {
        await q.eq("user_id", userId);
      } else {
        await q.eq("stripe_subscription_id", sub.id);
      }

      if (userId) {
        await admin.from("users").update({ is_active: false }).eq("id", userId);

        emitEvent(userId, "subscription.canceled", {
          subscription_id: sub.id,
          canceled_at: new Date().toISOString(),
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}

export const runtime = "nodejs";
