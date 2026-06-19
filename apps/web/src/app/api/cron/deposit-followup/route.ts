import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSMS } from "@/lib/sms/send";

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

    const message = `Hi ${appointment.customer_name}, we noticed you didn't complete your deposit for your ${serviceName} appointment. Can we help? Reply to this message or call us and we'll be happy to assist.`;

    const result = await sendSMS({
      to: appointment.customer_phone,
      body: message,
      type: "RESCUE",
    });

    if (result.success) {
      await admin
        .from("payments")
        .update({ followed_up: true })
        .eq("id", payment.id);

      sent++;
    }
  }

  return NextResponse.json({ sent });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
