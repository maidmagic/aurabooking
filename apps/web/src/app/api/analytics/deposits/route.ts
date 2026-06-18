import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: paidPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("user_id", user.id)
    .eq("status", "paid");

  const totalCollected = (paidPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const { count: pendingCount } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");

  const { count: abandonedCount } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "failed")
    .gte("created_at", twentyFourHoursAgo);

  const totalPayments = (paidPayments ?? []).length + (pendingCount ?? 0) + (abandonedCount ?? 0);
  const conversionRate = totalPayments > 0
    ? Math.round(((paidPayments ?? []).length / totalPayments) * 100)
    : 0;

  const { data: recentPayments } = await supabase
    .from("payments")
    .select("id, amount, status, paid_at, created_at, appointment_id, appointments(customer_name, start_time, services(name))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const recentDeposits = (recentPayments ?? []).map((p: any) => ({
    id: p.id,
    amount: p.amount,
    status: p.status,
    paid_at: p.paid_at,
    created_at: p.created_at,
    appointment: p.appointments ? {
      customer_name: p.appointments.customer_name,
      start_time: p.appointments.start_time,
      service_name: p.appointments.services?.name ?? null,
    } : null,
  }));

  const { count: bookingsStarted } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", sevenDaysAgo);

  const { count: paymentLinksSent } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", sevenDaysAgo);

  const { count: depositsCompleted } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "paid")
    .gte("created_at", sevenDaysAgo);

  return NextResponse.json({
    total_collected: totalCollected,
    total_collected_dollars: totalCollected / 100,
    pending_count: pendingCount ?? 0,
    abandoned_24h: abandonedCount ?? 0,
    conversion_rate: conversionRate,
    recent_deposits: recentDeposits,
    funnel: {
      bookings_started: bookingsStarted ?? 0,
      payment_links_sent: paymentLinksSent ?? 0,
      deposits_completed: depositsCompleted ?? 0,
    },
  });
}
