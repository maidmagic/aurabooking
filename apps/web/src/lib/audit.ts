import { createAdminClient } from "@/lib/supabase/admin";

export async function logAudit({
  userId,
  action,
  resource,
  resourceId,
  metadata,
  ipAddress,
}: {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      user_id: userId ?? null,
      action,
      resource,
      resource_id: resourceId ?? null,
      metadata: metadata ?? {},
      ip_address: ipAddress ?? null,
    });
  } catch {
    // Audit logging should never crash the caller
  }
}
