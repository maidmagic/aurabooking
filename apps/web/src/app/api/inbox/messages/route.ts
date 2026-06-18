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

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversation_id, content } = await request.json();
  if (!conversation_id || !content) {
    return NextResponse.json({ error: "conversation_id and content required" }, { status: 400 });
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, customer_phone, channel, user_id")
    .eq("id", conversation_id)
    .eq("user_id", user.id)
    .single();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id,
      role: "human_agent",
      content,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation_id);

  if (conv.customer_phone && conv.channel === "sms") {
    const { data: integration } = await supabase
      .from("integrations")
      .select("twilio_phone")
      .eq("user_id", user.id)
      .eq("provider", "twilio")
      .single();

    if (integration?.twilio_phone) {
      const twilio = (await import("twilio")).default;
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );
      try {
        await client.messages.create({
          body: content,
          from: integration.twilio_phone,
          to: conv.customer_phone,
        });
      } catch (err) {
        console.error("Failed to send SMS reply:", err);
      }
    }
  }

  return NextResponse.json(message);
}
