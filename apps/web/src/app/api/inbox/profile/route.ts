import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversation_id");
  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
  }

  // Get the conversation
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Find appointments for this customer (matched by phone or name)
  const appointmentsPromise = supabase
    .from("appointments")
    .select("id, customer_name, start_time, end_time, status, payment_status, service_id, services(name)")
    .eq("user_id", user.id)
    .or(`customer_phone.eq.${conversation.customer_phone || "none"},customer_name.eq.${conversation.customer_name || "none"}`)
    .order("start_time", { ascending: false })
    .limit(5);

  // Find payments linked to those appointments
  const paymentsPromise = supabase
    .from("payments")
    .select("id, amount, status, created_at, paid_at, appointment_id, appointments!inner(customer_name, start_time, service_id, services(name))")
    .eq("user_id", user.id)
    .eq("appointments.customer_phone", conversation.customer_phone || "none")
    .order("created_at", { ascending: false })
    .limit(5);

  // Get recent messages for intent scanning
  const messagesPromise = supabase
    .from("messages")
    .select("content, role")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);

  const [appointmentsResult, paymentsResult, messagesResult] = await Promise.all([
    appointmentsPromise,
    paymentsPromise,
    messagesPromise,
  ]);

  // Scan recent messages for intent keywords
  const intentKeywords = [
    "whiten", "clean", "checkup", "implant", "crown", "filling", "root canal",
    "extraction", "braces", "invisalign", "veneers", "consultation",
    "haircut", "color", "highlight", "facial", "massage", "manicure",
    "pedicure", "botox", "filler", "laser",
  ];

  const customerMessages = (messagesResult.data ?? [])
    .filter((m) => m.role === "customer")
    .map((m) => m.content.toLowerCase());

  const detectedIntent = intentKeywords
    .filter((kw) => customerMessages.some((msg) => msg.includes(kw)))
    .map((kw) => kw.charAt(0).toUpperCase() + kw.slice(1));

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      customer_name: conversation.customer_name,
      customer_phone: conversation.customer_phone,
      channel: conversation.channel,
      status: conversation.status,
      ai_active: conversation.ai_active,
      created_at: conversation.created_at,
    },
    appointments: (appointmentsResult.data ?? []).map((a: any) => ({
      id: a.id,
      customer_name: a.customer_name,
      start_time: a.start_time,
      end_time: a.end_time,
      status: a.status,
      payment_status: a.payment_status ?? "unpaid",
      service_name: a.services?.name ?? null,
    })),
    payments: (paymentsResult.data ?? []).map((p: any) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      paid_at: p.paid_at,
    })),
    detected_intent: [...new Set(detectedIntent)], // deduplicate
  });
}
