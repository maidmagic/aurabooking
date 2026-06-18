import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { conversation_id, business_id, content, customer_name, customer_email } = await request.json();

    if (!business_id || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = createAdminClient();
    let convId = conversation_id;

    if (!convId) {
      const { data: conv, error: convError } = await admin
        .from("conversations")
        .insert({
          channel: "web_chat",
          user_id: business_id,
          status: "active",
          customer_name: customer_name || null,
          customer_email: customer_email || null,
          ai_active: true,
        })
        .select("id")
        .single();

      if (convError) {
        return NextResponse.json({ error: convError.message }, { status: 500 });
      }

      convId = conv.id;
    }

    const { data: message, error: msgError } = await admin
      .from("messages")
      .insert({
        conversation_id: convId,
        role: "customer",
        content,
        msg_type: "text",
      })
      .select("id, role, content, msg_type, created_at")
      .single();

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: convId, message: content }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      // AI pipeline failure is non-blocking
    }

    return NextResponse.json({ conversation_id: convId, message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversation_id = searchParams.get("conversation_id");

  if (!conversation_id) {
    return NextResponse.json({ error: "Missing conversation_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: messages, error } = await admin
    .from("messages")
    .select("id, role, content, msg_type, created_at")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: messages ?? [] });
}
