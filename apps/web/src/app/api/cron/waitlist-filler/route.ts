import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find cancelled appointments in the last 5 min that have a service_id
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: cancelled } = await admin
    .from("appointments")
    .select("id, user_id, service_id, start_time, end_time")
    .eq("status", "cancelled")
    .gte("cancelled_at", fiveMinAgo)
    .not("service_id", "is", null);

  if (!cancelled || cancelled.length === 0) {
    return NextResponse.json({ notified: 0 });
  }

  let notified = 0;

  for (const apt of cancelled) {
    // Find active waitlist entries for this service
    const { data: waitlisted } = await admin
      .from("waitlist")
      .select("*")
      .eq("user_id", apt.user_id)
      .eq("service_id", apt.service_id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(3);

    if (!waitlisted || waitlisted.length === 0) continue;

    for (const entry of waitlisted) {
      const { default: twilio } = await import("twilio");
      const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

      const dt = new Date(apt.start_time);
      const timeStr = dt.toLocaleTimeString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit" });

      const body = `Hi ${entry.customer_name}! A slot just opened up ${timeStr}. Text YES to grab it instantly!`;

      try {
        await client.messages.create({
          body,
          from: (await admin.from("integrations").select("twilio_phone").eq("user_id", apt.user_id).eq("provider", "twilio").maybeSingle()).data?.twilio_phone || "",
          to: entry.customer_phone,
          statusCallback: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/twilio/status`,
        });

        await admin.from("waitlist").update({
          sent_offers: (entry.sent_offers ?? 0) + 1,
          status: "notified",
        }).eq("id", entry.id);

        notified++;
      } catch {
        // skip failed sends
      }
    }
  }

  return NextResponse.json({ notified });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
