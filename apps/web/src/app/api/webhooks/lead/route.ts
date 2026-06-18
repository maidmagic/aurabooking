import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emitEvent } from "@/lib/webhooks/emit";
import crypto from "crypto";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key required in X-Api-Key header" }, { status: 401 });
  }

  const hashed = hashKey(apiKey);

  const admin = createAdminClient();

  // Find user by hashed key
  const { data: settings } = await admin
    .from("ai_settings")
    .select("user_id, webhook_enabled")
    .eq("webhook_api_key_hash", hashed)
    .maybeSingle();

  if (!settings) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!settings.webhook_enabled) {
    return NextResponse.json({ error: "Webhook integrations are disabled" }, { status: 403 });
  }

  const body = await request.json();
  const { name, phone, email, message, source } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }

  // Create conversation
  const { data: conversation, error: convError } = await admin
    .from("conversations")
    .insert({
      user_id: settings.user_id,
      customer_name: name,
      customer_phone: phone,
      channel: "webhook",
      status: "new",
      ai_active: true,
    })
    .select()
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }

  // Create initial message from the lead
  const leadMessage = message || `New lead from ${source || "webhook"}`;
  await admin.from("messages").insert({
    conversation_id: conversation.id,
    role: "customer",
    content: leadMessage,
  });

  emitEvent(settings.user_id, "lead.created", {
    id: conversation.id,
    customer_name: name,
    customer_phone: phone,
    email: email || null,
    message: message || null,
    source: source || "webhook",
    channel: "webhook",
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    conversation_id: conversation.id,
  }, { status: 201 });
}

export const dynamic = "force-dynamic";
