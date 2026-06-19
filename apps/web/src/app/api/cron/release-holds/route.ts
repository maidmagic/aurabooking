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
  const now = new Date().toISOString();

  const { data: expiredHolds } = await admin
    .from("slot_holds")
    .select("id, user_id, start_time, end_time, conversation_id")
    .lt("expires_at", now)
    .eq("released", false);

  let released = 0;

  for (const hold of (expiredHolds ?? [])) {
    await admin
      .from("slot_holds")
      .update({ released: true })
      .eq("id", hold.id);

    const { data: appointments } = await admin
      .from("appointments")
      .select("id, customer_name, customer_phone, payment_status")
      .eq("user_id", hold.user_id)
      .eq("start_time", hold.start_time)
      .eq("payment_status", "pending");

    for (const apt of (appointments ?? [])) {
      await admin
        .from("appointments")
        .update({ payment_status: "unpaid" })
        .eq("id", apt.id);

      await admin
        .from("payments")
        .update({ status: "failed" })
        .eq("appointment_id", apt.id)
        .eq("status", "pending");

      if (apt.customer_phone) {
        const { data: integration } = await admin
          .from("integrations")
          .select("twilio_phone")
          .eq("user_id", hold.user_id)
          .eq("provider", "twilio")
          .single();

        if (integration?.twilio_phone) {
          try {
            const client = getTwilioClient();
            await client.messages.create({
              body: `Hi ${apt.customer_name}, your time slot has been released because the deposit was not completed. You can re-book anytime.`,
              from: integration.twilio_phone,
              to: apt.customer_phone,
            });
          } catch (err) {
            console.error("Failed to send hold release SMS:", err);
          }
        }
      }
    }

    released++;
  }

  return NextResponse.json({ released });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
