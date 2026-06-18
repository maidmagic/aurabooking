import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const leads: Array<{
    id: string;
    type: "abandoned_deposit" | "stale_conversation" | "new_lead";
    priority: "hot" | "warm" | "new";
    customer_name: string | null;
    customer_phone: string | null;
    channel: string;
    summary: string;
    created_at: string;
    last_contact: string | null;
    conversation_id?: string;
  }> = [];

  // 1. Abandoned Deposits (Hot)
  const { data: failedPayments } = await supabase
    .from("payments")
    .select("id, amount, created_at, appointment_id, appointments(customer_name, customer_phone)")
    .eq("user_id", user.id)
    .eq("status", "failed")
    .eq("followed_up", false);

  for (const p of (failedPayments ?? [])) {
    const apt = (p as any).appointments;
    leads.push({
      id: p.id,
      type: "abandoned_deposit",
      priority: "hot",
      customer_name: apt?.customer_name ?? null,
      customer_phone: apt?.customer_phone ?? null,
      channel: "sms",
      summary: `Abandoned deposit of $${((p.amount ?? 0) / 100).toFixed(2)}`,
      created_at: p.created_at,
      last_contact: p.created_at,
    });
  }

  // 2. Stale Conversations (Warm)
  const { data: staleConversations } = await supabase
    .from("conversations")
    .select("id, channel, customer_name, customer_phone, status, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .lt("updated_at", twentyFourHoursAgo)
    .order("updated_at", { ascending: true });

  for (const conv of (staleConversations ?? [])) {
    leads.push({
      id: conv.id,
      type: "stale_conversation",
      priority: "warm",
      customer_name: conv.customer_name,
      customer_phone: conv.customer_phone,
      channel: conv.channel,
      summary: `No activity for ${Math.round((now.getTime() - new Date(conv.updated_at).getTime()) / 3600000)}h`,
      created_at: conv.created_at,
      last_contact: conv.updated_at,
      conversation_id: conv.id,
    });
  }

  // 3. New Unengaged Leads
  const { data: newConversations } = await supabase
    .from("conversations")
    .select("id, channel, customer_name, customer_phone, status, created_at")
    .eq("user_id", user.id)
    .in("status", ["active", "qualifying"])
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false });

  for (const conv of (newConversations ?? [])) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conv.id);

    if (count !== null && count < 4) {
      leads.push({
        id: conv.id,
        type: "new_lead",
        priority: "new",
        customer_name: conv.customer_name,
        customer_phone: conv.customer_phone,
        channel: conv.channel,
        summary: `${count} message${count !== 1 ? "s" : ""} — status: ${conv.status}`,
        created_at: conv.created_at,
        last_contact: conv.created_at,
        conversation_id: conv.id,
      });
    }
  }

  const priorityOrder = { hot: 0, warm: 1, new: 2 };
  leads.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const counts = {
    hot: leads.filter((l) => l.priority === "hot").length,
    warm: leads.filter((l) => l.priority === "warm").length,
    new: leads.filter((l) => l.priority === "new").length,
    total: leads.length,
  };

  return NextResponse.json({ leads, counts });
}
