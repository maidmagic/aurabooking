import { createAdminClient } from "@/lib/supabase/admin";
import { getStore } from "@/lib/distributed-store";

export type ResourceType = "SMS" | "AI" | "BOOKING";

export interface GateResponse {
  allowed: boolean;
  reason?: "TRIAL_EXPIRED" | "SMS_QUOTA_EXHAUSTED" | "AI_QUOTA_EXHAUSTED" | "BOOKING_LIMIT_EXCEEDED" | "ACCOUNT_SUSPENDED" | "TRIAL_MAXED";
}

export async function verifyTenantAccess(
  userId: string,
  resourceType: ResourceType,
): Promise<GateResponse> {
  const store = getStore();

  // 1. Check Redis for cached suspension
  const isSuspended = await store.get(`tenant:suspended:${userId}`);
  if (isSuspended) {
    return { allowed: false, reason: "ACCOUNT_SUSPENDED" };
  }

  // 2. Fetch subscription state
  const admin = createAdminClient();
  const { data: sub, error } = await admin
    .from("subscriptions")
    .select(
      "status, plan, trial_ends_at, trial_sms_allowance, trial_sms_used, trial_ai_cost_allowance_cents, trial_ai_cost_used_cents, monthly_booking_limit, monthly_booking_used",
    )
    .eq("user_id", userId)
    .single();

  if (error || !sub) {
    return { allowed: false, reason: "ACCOUNT_SUSPENDED" };
  }

  // 3. Monthly booking cap (applies to all plans)
  if (resourceType === "BOOKING" && (sub.monthly_booking_used ?? 0) >= (sub.monthly_booking_limit ?? 999999)) {
    return { allowed: false, reason: "BOOKING_LIMIT_EXCEEDED" };
  }

  // 4. Non-trial gates
  if (sub.plan !== "trial") {
    if (["past_due", "unpaid", "canceled", "expired"].includes(sub.status)) {
      await store.set(`tenant:suspended:${userId}`, "true", 300_000);
      return { allowed: false, reason: "ACCOUNT_SUSPENDED" };
    }
    return { allowed: true };
  }

  // 5. Time boundary
  if (sub.trial_ends_at && new Date() > new Date(sub.trial_ends_at)) {
    await admin.from("subscriptions").update({ status: "expired" }).eq("user_id", userId);
    return { allowed: false, reason: "TRIAL_EXPIRED" };
  }

  // 6. Trial consumption ceilings
  if (resourceType === "SMS" && sub.trial_sms_used >= sub.trial_sms_allowance) {
    return { allowed: false, reason: "SMS_QUOTA_EXHAUSTED" };
  }

  if (
    resourceType === "AI" &&
    sub.trial_ai_cost_used_cents >= sub.trial_ai_cost_allowance_cents
  ) {
    return { allowed: false, reason: "AI_QUOTA_EXHAUSTED" };
  }

  return { allowed: true };
}
