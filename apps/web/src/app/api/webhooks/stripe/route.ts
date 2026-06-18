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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const appointmentId = session.metadata?.appointment_id;

    if (appointmentId) {
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
        .select("user_id, customer_name")
        .eq("id", appointmentId)
        .single();

      if (appointment) {
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

  return NextResponse.json({ received: true });
}
