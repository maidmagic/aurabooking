import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import twilio from "twilio";
import { chunkedMap, countFulfilled } from "@/lib/batch";

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const startStr = dayStart.toISOString();
  const endStr = dayEnd.toISOString();
  const reportDate = dayStart.toISOString().split("T")[0];

  const { data: users } = await admin.from("users").select("id, phone");

  let reportsCreated = 0;

  // Phase 1: build all reports (sequential DB work)
  const smsTasks: { user: any; reportData: any; integration: any }[] = [];

  for (const user of (users ?? [])) {
    const { data: userConvs } = await admin
      .from("conversations")
      .select("id")
      .eq("user_id", user.id);

    const convIds = (userConvs ?? []).map((c: any) => c.id);

    const [
      newConvsResult,
      bookedResult,
      cancelledResult,
      paidResult,
      pendingResult,
      abandonedResult,
      remindersResult,
      missedResult,
    ] = await Promise.all([
      admin.from("conversations").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", startStr).lt("created_at", endStr),
      admin.from("appointments").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).in("status", ["booked", "confirmed"]).gte("created_at", startStr).lt("created_at", endStr),
      admin.from("appointments").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "cancelled").gte("created_at", startStr).lt("created_at", endStr),
      admin.from("payments").select("amount")
        .eq("user_id", user.id).eq("status", "paid").gte("paid_at", startStr).lt("paid_at", endStr),
      admin.from("payments").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "pending"),
      admin.from("payments").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "failed").gte("created_at", startStr).lt("created_at", endStr),
      admin.from("reminders").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "sent").gte("created_at", startStr).lt("created_at", endStr),
      admin.from("conversations").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("channel", "voice").gte("created_at", startStr).lt("created_at", endStr),
    ]);

    let msgCount = 0;
    if (convIds.length > 0) {
      const { count } = await admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .gte("created_at", startStr)
        .lt("created_at", endStr);
      msgCount = count ?? 0;
    }

    const depositRevenue = (paidResult.data ?? []).reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);

    const reportData = {
      new_conversations: newConvsResult.count ?? 0,
      booked_appointments: bookedResult.count ?? 0,
      cancelled_appointments: cancelledResult.count ?? 0,
      deposits_collected: paidResult.count ?? 0,
      deposit_revenue: depositRevenue,
      pending_deposits: pendingResult.count ?? 0,
      abandoned_deposits: abandonedResult.count ?? 0,
      reminders_sent: remindersResult.count ?? 0,
      missed_calls: missedResult.count ?? 0,
      messages_exchanged: msgCount,
    };

    const { data: existing } = await admin
      .from("daily_reports")
      .select("id")
      .eq("user_id", user.id)
      .eq("report_date", reportDate)
      .maybeSingle();

    if (existing) {
      await admin.from("daily_reports").update({ data: reportData }).eq("id", existing.id);
    } else {
      await admin.from("daily_reports").insert({ user_id: user.id, report_date: reportDate, data: reportData });
    }

    reportsCreated++;

    // Collect SMS tasks for batch send
    if (user.phone) {
      const { data: integration } = await admin
        .from("integrations")
        .select("twilio_phone")
        .eq("user_id", user.id)
        .eq("provider", "twilio")
        .single();

      if (integration?.twilio_phone) {
        smsTasks.push({ user, reportData, integration });
      }
    }
  }

  // Phase 2: batch-send summary SMS in chunks of 25
  if (smsTasks.length > 0) {
    const results = await chunkedMap(smsTasks, async ({ user, reportData, integration }) => {
      const client = getTwilioClient();
      const summary = `AuraBooking Daily Summary (${reportDate})\n` +
        `New Conversations: ${reportData.new_conversations}\n` +
        `Bookings: ${reportData.booked_appointments}\n` +
        `Deposits Collected: ${reportData.deposits_collected} ($${(reportData.deposit_revenue / 100).toFixed(2)})\n` +
        `Pending Deposits: ${reportData.pending_deposits}\n` +
        `Reminders Sent: ${reportData.reminders_sent}\n` +
        `Missed Calls: ${reportData.missed_calls}`;

      await client.messages.create({
        body: summary,
        from: integration.twilio_phone,
        to: user.phone,
      });

      await admin.from("daily_reports").update({ sms_sent: true }).eq("user_id", user.id).eq("report_date", reportDate);
    });

    console.log(`Daily summary: ${countFulfilled(results)}/${smsTasks.length} SMS sent`);
  }

  return NextResponse.json({ reports_created: reportsCreated, sms_sent: smsTasks.length });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
