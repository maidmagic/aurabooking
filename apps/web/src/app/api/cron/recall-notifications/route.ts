import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get all active recall schedules
  const { data: schedules } = await admin
    .from("recall_schedules")
    .select("*")
    .eq("active", true);

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;

  for (const schedule of schedules) {
    // Find appointments where enough time has passed since last visit
    const cutoff = new Date(Date.now() - schedule.interval_days * 24 * 60 * 60 * 1000).toISOString();

    const { data: due } = await admin
      .from("appointments")
      .select("customer_name, customer_phone, user_id")
      .eq("user_id", schedule.user_id)
      .eq("service_id", schedule.service_id)
      .eq("status", "completed")
      .lte("created_at", cutoff)
      .limit(10);

    if (!due) continue;

    for (const apt of due) {
      // Check if already notified for this schedule
      const { data: existing } = await admin
        .from("recall_notifications")
        .select("id")
        .eq("customer_phone", apt.customer_phone)
        .eq("recall_schedule_id", schedule.id)
        .maybeSingle();

      if (existing) continue;

      const { default: twilio } = await import("twilio");
      const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

      const body = schedule.message_template.replace("{name}", apt.customer_name || "there");

      try {
        await client.messages.create({
          body,
          from: (await admin.from("integrations").select("twilio_phone").eq("user_id", schedule.user_id).eq("provider", "twilio").maybeSingle()).data?.twilio_phone || "",
          to: apt.customer_phone,
        });

        await admin.from("recall_notifications").insert({
          user_id: schedule.user_id,
          customer_phone: apt.customer_phone,
          service_id: schedule.service_id,
          recall_schedule_id: schedule.id,
        });

        sent++;
      } catch {
        // skip failed sends
      }
    }
  }

  return NextResponse.json({ sent });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
