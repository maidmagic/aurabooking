import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appointment_id } = await request.json();
  if (!appointment_id) {
    return NextResponse.json({ error: "appointment_id required" }, { status: 400 });
  }

  const admin = createAdminClient();

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

  const { data: integration } = await admin
    .from("integrations")
    .select("twilio_phone")
    .eq("user_id", user.id)
    .eq("provider", "twilio")
    .single();

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: serviceName },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    automatic_tax: { enabled: true },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/appointments?paid=${appointment_id}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/appointments`,
    metadata: {
      appointment_id,
      user_id: user.id,
    },
  }, { idempotencyKey: `payment_${appointment_id}` });

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

  await admin
    .from("appointments")
    .update({ payment_status: "pending" })
    .eq("id", appointment_id);

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
