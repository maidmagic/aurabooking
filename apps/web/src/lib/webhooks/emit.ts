import { createAdminClient } from "@/lib/supabase/admin";

export async function emitEvent(
  userId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: hooks, error } = await admin
      .from("outgoing_webhooks")
      .select("target_url")
      .eq("user_id", userId)
      .eq("event_type", eventType)
      .eq("is_active", true);

    if (error) return;

    for (const hook of hooks ?? []) {
      fetch(hook.target_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  } catch {
    // Silent fail - don't block the main flow
  }
}
