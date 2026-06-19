import { createAdminClient } from "@/lib/supabase/admin";

interface OutboxEntry {
  user_id: string;
  appointment_id?: string;
  event_type: "create" | "update" | "delete";
  summary: string;
  start_time: string;
  end_time: string;
}

/** Insert a calendar sync request into the outbox instead of calling Google Calendar directly.
 *  A background cron polls the outbox and dispatches actual API calls. */
export async function enqueueCalendarSync(entry: OutboxEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("calendar_outbox").insert({
      user_id: entry.user_id,
      appointment_id: entry.appointment_id ?? null,
      event_type: entry.event_type,
      summary: entry.summary,
      start_time: entry.start_time,
      end_time: entry.end_time,
      status: "pending",
    });
  } catch {
    // Non-fatal — the cron and daily reconciliation process will catch missed entries
  }
}
