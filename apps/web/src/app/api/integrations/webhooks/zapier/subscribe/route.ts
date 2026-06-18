import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  const admin = createAdminClient();
  const hashed = hashKey(apiKey);

  const { data: settings } = await admin
    .from("ai_settings")
    .select("user_id")
    .eq("webhook_api_key_hash", hashed)
    .eq("webhook_enabled", true)
    .maybeSingle();

  if (!settings) {
    return NextResponse.json({ error: "Invalid or disabled API key" }, { status: 401 });
  }

  const body = await request.json();
  const { event_type, target_url } = body;

  if (!event_type || !target_url) {
    return NextResponse.json({ error: "event_type and target_url required" }, { status: 400 });
  }

  const validEvents = ["booking.created", "lead.created", "payment.completed"];
  if (!validEvents.includes(event_type)) {
    return NextResponse.json({ error: `Invalid event_type. Valid: ${validEvents.join(", ")}` }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("outgoing_webhooks")
    .select("id")
    .eq("user_id", settings.user_id)
    .eq("event_type", event_type)
    .eq("target_url", target_url)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ id: existing.id, success: true });
  }

  const { data: hook, error } = await admin
    .from("outgoing_webhooks")
    .insert({
      user_id: settings.user_id,
      event_type,
      target_url,
    })
    .select("id")
    .single();

  if (error || !hook) {
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }

  return NextResponse.json({ id: hook.id, success: true }, { status: 201 });
}

export const dynamic = "force-dynamic";
