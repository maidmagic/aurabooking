import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  // Monthly revenue (deposits paid this month)
  const { data: monthlyPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("user_id", user.id)
    .eq("status", "paid")
    .gte("paid_at", monthStart);

  const monthlyRevenue = (monthlyPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  // YTD revenue
  const { data: ytdPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("user_id", user.id)
    .eq("status", "paid")
    .gte("paid_at", yearStart);

  const ytdRevenue = (ytdPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  // Monthly bookings
  const { count: monthlyBookings } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["confirmed", "completed"])
    .gte("start_time", monthStart);

  // No-shows prevented = deposits completed this month
  const { count: depositsCompleted } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "paid")
    .gte("paid_at", monthStart);

  // Conversations handled by AI this month
  const { count: aiConversations } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", monthStart);

  return NextResponse.json({
    monthly_revenue_cents: monthlyRevenue,
    monthly_revenue_dollars: monthlyRevenue / 100,
    ytd_revenue_cents: ytdRevenue,
    ytd_revenue_dollars: ytdRevenue / 100,
    monthly_bookings: monthlyBookings ?? 0,
    deposits_completed: depositsCompleted ?? 0,
    ai_conversations: aiConversations ?? 0,
  });
}

export const dynamic = "force-dynamic";
