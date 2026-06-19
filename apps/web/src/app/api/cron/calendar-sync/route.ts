import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStore } from "@/lib/distributed-store";

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Distributed mutex lock — prevents concurrent Vercel serverless executions
  const store = getStore();
  const acquired = await store.setnx("cron_lock:calendar_sync", "locked", 55_000);
  if (!acquired) {
    return NextResponse.json({ processed: 0, skipped: "concurrent_run" });
  }

  try {
    const admin = createAdminClient();

    // Fetch pending items (oldest first, max 10 per run)
    const { data: pending } = await admin
      .from("calendar_outbox")
      .select("*")
      .eq("status", "pending")
      .lte("retry_count", 2)
      .order("created_at", { ascending: true })
      .limit(10);

    if (!pending || pending.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let processed = 0;
    let failed = 0;

    for (const item of pending) {
      await admin.from("calendar_outbox").update({ status: "processing" }).eq("id", item.id);

      try {
        const { createCalendarEvent } = await import("@/lib/google/calendar");
        const summary = item.summary;
        const eventId = await createCalendarEvent(item.user_id, summary, item.start_time, item.end_time);

        if (eventId) {
          await admin.from("calendar_outbox").update({
            status: "completed",
            google_event_id: eventId,
          }).eq("id", item.id);

          if (item.appointment_id) {
            await admin.from("appointments").update({ google_event_id: eventId }).eq("id", item.appointment_id);
          }

          processed++;
        } else {
          throw new Error("Calendar event creation returned no ID");
        }
      } catch (err: any) {
        const newRetryCount = (item.retry_count ?? 0) + 1;
        await admin.from("calendar_outbox").update({
          status: newRetryCount >= 3 ? "failed" : "pending",
          retry_count: newRetryCount,
          last_error: err.message,
        }).eq("id", item.id);
        failed++;
      }
    }

    return NextResponse.json({ processed, failed });
  } finally {
    await store.del("cron_lock:calendar_sync");
  }
}

export const dynamic = "force-dynamic";
