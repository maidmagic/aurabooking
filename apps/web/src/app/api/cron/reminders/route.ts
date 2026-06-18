import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import twilio from "twilio";

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()} at ${h}:${mins} ${ampm}`;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const targetStart = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 55 * 60 * 1000);
  const targetEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000);

  const { data: appointments } = await admin
    .from("appointments")
    .select("id, user_id, customer_name, customer_phone, start_time, end_time, service_id, services(name)")
    .gte("start_time", targetStart.toISOString())
    .lte("start_time", targetEnd.toISOString())
    .in("status", ["confirmed", "booked"])
    .not("customer_phone", "is", null)
    .not("customer_phone", "eq", "");

  let sent = 0;

  for (const apt of (appointments ?? [])) {
    const { data: existing } = await admin
      .from("reminders")
      .select("id")
      .eq("appointment_id", apt.id)
      .maybeSingle();
    if (existing) continue;

    const { data: settings } = await admin
      .from("reminder_settings")
      .select("*")
      .eq("user_id", apt.user_id)
      .maybeSingle();
    if (!settings?.enabled) continue;

    const { data: user } = await admin
      .from("users")
      .select("company_name")
      .eq("id", apt.user_id)
      .single();

    const serviceName = (apt as any).services?.name ?? "appointment";
    const companyName = user?.company_name ?? "our office";
    const message = settings.template
      .replace(/\{customer_name\}/g, apt.customer_name)
      .replace(/\{service\}/g, serviceName)
      .replace(/\{start_time\}/g, formatDateTime(apt.start_time))
      .replace(/\{business_name\}/g, companyName);

    const { data: integration } = await admin
      .from("integrations")
      .select("twilio_phone")
      .eq("user_id", apt.user_id)
      .eq("provider", "twilio")
      .single();
    if (!integration?.twilio_phone) continue;

    try {
      const client = getTwilioClient();
      await client.messages.create({
        body: message,
        from: integration.twilio_phone,
        to: apt.customer_phone,
      });

      await admin.from("reminders").insert({
        appointment_id: apt.id,
        user_id: apt.user_id,
        status: "sent",
      });

      sent++;
    } catch (err) {
      console.error(`Failed to send reminder for appointment ${apt.id}:`, err);
    }
  }

  return NextResponse.json({ sent });
}

export const dynamic = "force-dynamic";
