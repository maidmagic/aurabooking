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
  const { target_url, event_type } = body;

  if (!target_url) {
    return NextResponse.json({ error: "target_url required" }, { status: 400 });
  }

  const query = admin
    .from("outgoing_webhooks")
    .delete()
    .eq("user_id", settings.user_id)
    .eq("target_url", target_url);

  if (event_type) query.eq("event_type", event_type);

  await query;

  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
