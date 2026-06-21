import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSMS } from "@/lib/sms/send";
import { chunkedMap, countFulfilled } from "@/lib/batch";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${mins} ${ampm}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

async function send24hReminders(admin: ReturnType<typeof createAdminClient>) {
  const now = new Date();
  const targetStart = new Date(now.getTime() + 23.9 * 60 * 60 * 1000);
  const targetEnd = new Date(now.getTime() + 24.1 * 60 * 60 * 1000);

  const { data: appointments } = await admin
    .from("appointments")
    .select("id, user_id, customer_name, customer_phone, start_time, end_time, service_id, services(name)")
    .gte("start_time", targetStart.toISOString())
    .lte("start_time", targetEnd.toISOString())
    .in("status", ["confirmed", "booked"])
    .not("customer_phone", "is", null)
    .not("customer_phone", "eq", "");

  const tasks: { appointmentId: string; userId: string; to: string; body: string }[] = [];

  for (const apt of (appointments ?? [])) {
    const { data: existing } = await admin
      .from("reminders")
      .select("id")
      .eq("appointment_id", apt.id)
      .eq("reminder_type", "24h")
      .maybeSingle();
    if (existing) continue;

    const { data: settings } = await admin
      .from("reminder_settings")
      .select("*")
      .eq("user_id", apt.user_id)
      .maybeSingle();
    if (!settings?.enabled || !settings.reminder_24h_enabled) continue;

    const serviceName = (apt as any).services?.name ?? "appointment";
    const dayLabel = formatDate(apt.start_time);
    const message = `Hi ${apt.customer_name}, this is a reminder for your ${serviceName} on ${dayLabel} at ${formatDateTime(apt.start_time)}. Reply Y to confirm or N to cancel.`;

    const { data: integration } = await admin
      .from("integrations")
      .select("twilio_phone")
      .eq("user_id", apt.user_id)
      .eq("provider", "twilio")
      .single();
    if (!integration?.twilio_phone) continue;

    tasks.push({ appointmentId: apt.id, userId: apt.user_id, to: apt.customer_phone, body: message });
  }

  const results = await chunkedMap(tasks, async (task) => {
    const result = await sendSMS({ to: task.to, body: task.body, type: "RESCUE" });
    if (result.success) {
      await admin.from("reminders").insert({
        appointment_id: task.appointmentId,
        user_id: task.userId,
        status: "sent",
        reminder_type: "24h",
      });
    }
    return result.success;
  });

  return { sent: countFulfilled(results), total: tasks.length };
}

async function sendSameDayReminders(admin: ReturnType<typeof createAdminClient>) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const { data: appointments } = await admin
    .from("appointments")
    .select("id, user_id, customer_name, customer_phone, start_time, end_time, service_id, services(name)")
    .gte("start_time", todayStart.toISOString())
    .lte("start_time", todayEnd.toISOString())
    .in("status", ["confirmed", "booked"])
    .not("customer_phone", "is", null)
    .not("customer_phone", "eq", "");

  const tasks: { appointmentId: string; userId: string; to: string; body: string }[] = [];

  for (const apt of (appointments ?? [])) {
    const { data: existing } = await admin
      .from("reminders")
      .select("id")
      .eq("appointment_id", apt.id)
      .eq("reminder_type", "1h")
      .maybeSingle();
    if (existing) continue;

    const { data: settings } = await admin
      .from("reminder_settings")
      .select("*")
      .eq("user_id", apt.user_id)
      .maybeSingle();
    if (!settings?.enabled || !settings.reminder_1h_enabled) continue;

    const serviceName = (apt as any).services?.name ?? "appointment";
    const message = `Hi ${apt.customer_name}, this is a reminder for your ${serviceName} today at ${formatDateTime(apt.start_time)}. Reply Y to confirm or N to cancel.`;

    const { data: integration } = await admin
      .from("integrations")
      .select("twilio_phone")
      .eq("user_id", apt.user_id)
      .eq("provider", "twilio")
      .single();
    if (!integration?.twilio_phone) continue;

    tasks.push({ appointmentId: apt.id, userId: apt.user_id, to: apt.customer_phone, body: message });
  }

  const results = await chunkedMap(tasks, async (task) => {
    const result = await sendSMS({ to: task.to, body: task.body, type: "RESCUE" });
    if (result.success) {
      await admin.from("reminders").insert({
        appointment_id: task.appointmentId,
        user_id: task.userId,
        status: "sent",
        reminder_type: "1h",
      });
    }
    return result.success;
  });

  return { sent: countFulfilled(results), total: tasks.length };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const [tomorrow, today] = await Promise.all([
    send24hReminders(admin),
    sendSameDayReminders(admin),
  ]);

  return NextResponse.json({ windows: { "24h": tomorrow, "1h": today } });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
