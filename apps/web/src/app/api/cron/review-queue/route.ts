import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSMS, optOutFooter } from "@/lib/sms/send";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: allSettings } = await admin
    .from("review_settings")
    .select("user_id, business_name, google_review_url, feedback_gate_enabled, initial_delay_minutes")
    .eq("enabled", true);

  let sent = 0;

  for (const settings of (allSettings ?? [])) {
    const delayMs = (settings.initial_delay_minutes || 120) * 60 * 1000;
    const earliestSend = new Date(now.getTime() - delayMs);

    const { data: appointments } = await admin
      .from("appointments")
      .select("id, customer_name, customer_phone")
      .eq("user_id", settings.user_id)
      .eq("status", "completed")
      .lt("start_time", earliestSend.toISOString());

    for (const apt of (appointments ?? [])) {
      const { data: existing } = await admin
        .from("review_requests")
        .select("id")
        .eq("appointment_id", apt.id)
        .maybeSingle();
      if (existing) continue;
      if (!apt.customer_phone) continue;

      const { data: request } = await admin
        .from("review_requests")
        .insert({
          user_id: settings.user_id,
          appointment_id: apt.id,
          status: "sent",
          sent_at: now.toISOString(),
        })
        .select("id")
        .single();

      if (!request) continue;

      const baseDomain = process.env.SHORT_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const shortLink = `${baseDomain}/r/${request.id}`;

      let body: string;
      if (settings.feedback_gate_enabled) {
        body = `Hi ${apt.customer_name}! How was your visit to ${settings.business_name || "us"} today? Reply with a number 1-5 (1 = poor, 5 = amazing).`;
      } else {
        body = `Hi ${apt.customer_name}, thanks for visiting ${settings.business_name || "us"} today! If you had a great experience, leave us a quick review: ${shortLink}`;
      }

      const result = await sendSMS({
        to: apt.customer_phone,
        body,
        type: "RECALL",
      });

      if (result.success) {
        sent++;
      } else {
        await admin.from("review_requests").update({ status: "pending" }).eq("id", request.id);
      }
    }
  }

  return NextResponse.json({ sent });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
