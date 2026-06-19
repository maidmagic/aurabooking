import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();

  const { data: subscriptions, error: subErr } = await admin
    .from("subscriptions")
    .select("user_id, plan, status, trial_ends_at, created_at");

  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  let payingCustomers = 0;
  let freeTrialUsers = 0;
  const payingIds: string[] = [];
  const trialIds: string[] = [];

  for (const sub of (subscriptions ?? [])) {
    if ((sub.plan === "pro" || sub.plan === "business") && sub.status === "active") {
      payingCustomers++;
      payingIds.push(sub.user_id);
    } else if (sub.plan === "free" && sub.trial_ends_at && sub.trial_ends_at > now) {
      freeTrialUsers++;
      trialIds.push(sub.user_id);
    }
  }

  const totalUsers = payingCustomers + freeTrialUsers;
  const conversionRate = totalUsers > 0
    ? ((payingCustomers / totalUsers) * 100).toFixed(1) + "%"
    : "0%";

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentPayments } = await admin
    .from("payments")
    .select("amount")
    .eq("status", "paid")
    .gte("paid_at", thirtyDaysAgo);

  const totalMRR = (recentPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const { data: allPaid } = await admin
    .from("payments")
    .select("amount")
    .eq("status", "paid");

  const platformROI = (allPaid ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const ghostAccounts: { name: string; email: string; status: string; daysInactive: number }[] = [];
  if (payingIds.length > 0) {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();

    const { data: activeUsers } = await admin
      .from("appointments")
      .select("user_id")
      .in("user_id", payingIds)
      .gte("created_at", fourDaysAgo);

    const activeSet = new Set((activeUsers ?? []).map((a) => a.user_id));
    const ghostIds = payingIds.filter((id) => !activeSet.has(id));

    for (const uid of ghostIds) {
      const { data: user } = await admin.from("users").select("email").eq("id", uid).single();
      const { data: lastAppt } = await admin
        .from("appointments")
        .select("created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1);

      const lastDate = lastAppt?.[0]?.created_at ?? new Date(0).toISOString();
      const daysInactive = Math.floor((Date.now() - new Date(lastDate).getTime()) / (24 * 60 * 60 * 1000));
      ghostAccounts.push({
        name: user?.email?.split("@")[0] ?? "Unknown",
        email: user?.email ?? "",
        status: "Paying",
        daysInactive,
      });
    }
  }

  const stuckTrials: { name: string; email: string; daysSinceSignup: number }[] = [];
  if (trialIds.length > 0) {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    for (const uid of trialIds) {
      const sub = (subscriptions ?? []).find((s) => s.user_id === uid);
      if (!sub) continue;

      if (sub.created_at && sub.created_at < twoDaysAgo) {
        const { count: bookingCount } = await admin
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", uid);

        if (!bookingCount || bookingCount === 0) {
          const { data: user } = await admin.from("users").select("email").eq("id", uid).single();
          const daysSince = Math.floor((Date.now() - new Date(sub.created_at).getTime()) / (24 * 60 * 60 * 1000));
          stuckTrials.push({
            name: user?.email?.split("@")[0] ?? "Unknown",
            email: user?.email ?? "",
            daysSinceSignup: daysSince,
          });
        }
      }
    }
  }

  logAudit({
    action: "admin.analytics.viewed",
    resource: "admin/analytics",
    metadata: { payingCustomers, freeTrialUsers },
  });

  return NextResponse.json({
    totalMRR: `$${(totalMRR / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    platformROI: `$${(platformROI / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    payingCustomers,
    freeTrialUsers,
    conversionRate,
    ghostAccounts,
    stuckTrials,
  });
}

export const dynamic = "force-dynamic";
