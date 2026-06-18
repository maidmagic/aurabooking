import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import twilio from "twilio";

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 40 * 60 * 1000).toISOString();

  const { data: failedPayments } = await admin
    .from("payments")
    .select("id, user_id, amount, appointment_id, created_at")
    .eq("status", "failed")
    .eq("followed_up", false)
    .lt("created_at", cutoff);

  let sent = 0;

  for (const payment of (failedPayments ?? [])) {
    const { data: appointment } = await admin
      .from("appointments")
      .select("customer_name, customer_phone, service_id, services(name)")
      .eq("id", payment.appointment_id)
      .single();

    if (!appointment?.customer_phone) continue;

    const serviceName = (appointment as any).services?.name ?? "appointment";

    const { data: integration } = await admin
      .from("integrations")
      .select("twilio_phone")
      .eq("user_id", payment.user_id)
      .eq("provider", "twilio")
      .single();

    if (!integration?.twilio_phone) continue;

    const message = `Hi ${appointment.customer_name}, we noticed you didn't complete your deposit for your ${serviceName} appointment. Can we help? Reply to this message or call us and we'll be happy to assist.`;

    try {
      const client = getTwilioClient();
      await client.messages.create({
        body: message,
        from: integration.twilio_phone,
        to: appointment.customer_phone,
      });

      await admin
        .from("payments")
        .update({ followed_up: true })
        .eq("id", payment.id);

      sent++;
    } catch (err) {
      console.error(`Failed to send deposit follow-up for payment ${payment.id}:`, err);
    }
  }

  return NextResponse.json({ sent });
}

export const dynamic = "force-dynamic";
