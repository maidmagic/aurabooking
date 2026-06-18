import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processMessage } from "@/lib/openai/pipeline";

const AI_TIMEOUT_MS = 15_000;

export async function POST(request: Request) {
  const { conversation_id, message } = await request.json();

  if (!conversation_id || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("conversations")
    .select("user_id")
    .eq("id", conversation_id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const reply = await processMessage(
      conversation_id,
      conversation.user_id,
      message,
      controller.signal
    );

    clearTimeout(timer);

    await admin.from("messages").insert({
      conversation_id,
      role: "ai",
      content: reply,
      msg_type: "text",
    });

    return NextResponse.json({ reply });
  } catch (error: any) {
    clearTimeout(timer);

    const fallback =
      error.name === "AbortError"
        ? "I'm still checking — give me a moment!"
        : "I'm having trouble right now. Let me transfer you to a team member.";

    await admin.from("messages").insert({
      conversation_id,
      role: "ai",
      content: fallback,
      msg_type: "text",
    });

    await admin
      .from("conversations")
      .update({
        status: "active",
        metadata: { needs_human: true, error: error.message },
      })
      .eq("id", conversation_id);

    return NextResponse.json({ reply: fallback });
  }
}
