import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSMS } from "@/lib/sms/send";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: allSettings } = await admin
    .from("review_settings")
    .select("user_id, business_name, google_review_url, follow_up_delay_minutes, feedback_gate_enabled")
    .eq("enabled", true);

  let sent = 0;

  for (const settings of (allSettings ?? [])) {
    const delayMs = (settings.follow_up_delay_minutes || 1440) * 60 * 1000;
    const cutoff = new Date(now.getTime() - delayMs).toISOString();

    const { data: pending } = await admin
      .from("review_requests")
      .select("id, appointment_id")
      .eq("user_id", settings.user_id)
      .eq("status", "sent")
      .lt("sent_at", cutoff)
      .is("followed_up_at", null);

    for (const req of (pending ?? [])) {
      const { data: apt } = await admin
        .from("appointments")
        .select("customer_name, customer_phone")
        .eq("id", req.appointment_id)
        .single();

      if (!apt?.customer_phone) continue;

      const baseDomain = process.env.SHORT_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const shortLink = `${baseDomain}/r/${req.id}`;

      let body: string;
      if (settings.feedback_gate_enabled) {
        body = `Hi ${apt.customer_name}, just checking in! We'd still love your feedback about your visit to ${settings.business_name || "us"}. Reply with a number 1-5 (1 = poor, 5 = amazing).`;
      } else {
        body = `Hi ${apt.customer_name}, just following up! We'd love to hear your feedback about your visit to ${settings.business_name || "us"}: ${shortLink}`;
      }

      const result = await sendSMS({
        to: apt.customer_phone,
        body,
        type: "RECALL",
      });

      if (result.success) {
        await admin.from("review_requests").update({ followed_up_at: now.toISOString(), status: "sent" }).eq("id", req.id);
        sent++;
      }
    }
  }

  return NextResponse.json({ sent });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
