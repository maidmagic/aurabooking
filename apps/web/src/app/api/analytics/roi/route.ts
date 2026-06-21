import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // Total conversations this month (missed calls intercepted)
  const { count: totalConversations } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", monthStart);

  // Conversations that resulted in bookings
  const { count: bookedConversations } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "booked")
    .gte("created_at", monthStart);

  const conversionRate = (totalConversations ?? 0) > 0
    ? Math.round(((bookedConversations ?? 0) / (totalConversations ?? 0)) * 100)
    : 0;

  // Bookings this month with service prices attached
  const { data: monthlyBookings } = await supabase
    .from("appointments")
    .select("id, service_id, status, start_time, services(name, price)")
    .eq("user_id", user.id)
    .in("status", ["confirmed", "completed"])
    .gte("created_at", monthStart);

  const totalBookings = monthlyBookings?.length ?? 0;
  const estimatedRevenue = (monthlyBookings ?? []).reduce(
    (sum, b) => sum + Number((b.services as any)?.price ?? 0), 0
  );

  // Actual revenue from payments this month
  const { data: monthlyPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("user_id", user.id)
    .eq("status", "paid")
    .gte("paid_at", monthStart);

  const actualRevenueCents = (monthlyPayments ?? []).reduce(
    (sum, p) => sum + (p.amount ?? 0), 0
  );

  // Today's conversations so far
  const { count: todayConversations } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", todayStart);

  // Today's bookings
  const { count: todayBookings } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["confirmed", "completed"])
    .gte("created_at", todayStart);

  // Daily breakdown for past 7 days
  const dailyData: { date: string; conversations: number; bookings: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = day.toISOString();
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).toISOString();

    const { count: dayConvs } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", dayStart)
      .lt("created_at", dayEnd);

    const { count: dayBooks } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["confirmed", "completed"])
      .gte("created_at", dayStart)
      .lt("created_at", dayEnd);

    dailyData.push({
      date: day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      conversations: dayConvs ?? 0,
      bookings: dayBooks ?? 0,
    });
  }

  return NextResponse.json({
    total_conversations: totalConversations ?? 0,
    booked_conversations: bookedConversations ?? 0,
    conversion_rate: conversionRate,
    total_bookings: totalBookings,
    estimated_revenue: estimatedRevenue,
    actual_revenue_cents: actualRevenueCents,
    actual_revenue_dollars: actualRevenueCents / 100,
    today_conversations: todayConversations ?? 0,
    today_bookings: todayBookings ?? 0,
    daily: dailyData,
  });
}

export const dynamic = "force-dynamic";
