import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import twilio from "twilio";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

export async function POST(request: Request) {
  const { appointment_id, conversation_id } = await request.json();
  if (!appointment_id) {
    return NextResponse.json({ error: "appointment_id required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: appointment } = await admin
    .from("appointments")
    .select("id, user_id, customer_name, customer_phone, service_id, start_time, end_time, services(name, price, deposit_required, deposit_amount)")
    .eq("id", appointment_id)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const svc = (appointment as any).services;
  if (!svc?.deposit_required) {
    return NextResponse.json({ error: "No deposit required for this service" }, { status: 400 });
  }

  const depositAmount = svc.deposit_amount ? Math.round(Number(svc.deposit_amount) * 100) : 0;
  if (depositAmount <= 0) {
    return NextResponse.json({ error: "Invalid deposit amount" }, { status: 400 });
  }

  const serviceName = svc?.name ?? "appointment";

  const { data: integration } = await admin
    .from("integrations")
    .select("twilio_phone")
    .eq("user_id", appointment.user_id)
    .eq("provider", "twilio")
    .single();

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: `${serviceName} Deposit` },
        unit_amount: depositAmount,
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/appointments?paid=${appointment_id}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/appointments`,
    metadata: {
      appointment_id,
      user_id: appointment.user_id,
      type: "deposit",
    },
  });

  const holdExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await admin.from("slot_holds").insert({
    user_id: appointment.user_id,
    start_time: appointment.start_time,
    end_time: appointment.end_time,
    expires_at: holdExpiry,
    conversation_id: conversation_id || null,
  });

  await admin.from("payments").insert({
    appointment_id,
    user_id: appointment.user_id,
    amount: depositAmount,
    stripe_session_id: checkoutSession.id,
    status: "pending",
  });

  await admin
    .from("appointments")
    .update({ payment_status: "pending", payment_intent_id: checkoutSession.id })
    .eq("id", appointment_id);

  if (appointment.customer_phone && integration?.twilio_phone) {
    const message = `To confirm your ${serviceName}, please complete your deposit of $${(depositAmount / 100).toFixed(2)} via this secure link: ${checkoutSession.url}. Your time slot is held for 10 minutes.`;
    try {
      const client = getTwilioClient();
      await client.messages.create({
        body: message,
        from: integration.twilio_phone,
        to: appointment.customer_phone,
      });
    } catch (err) {
      console.error("Failed to send deposit SMS:", err);
    }
  }

  return NextResponse.json({ url: checkoutSession.url, expires_at: holdExpiry });
}
