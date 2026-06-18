import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): string {
  const bytes = crypto.randomBytes(24);
  return "wbk_" + bytes.toString("hex");
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase
    .from("ai_settings")
    .select("webhook_api_key_hash, webhook_enabled")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/lead`,
    has_key: !!settings?.webhook_api_key_hash,
    enabled: settings?.webhook_enabled ?? true,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  let rawKey: string | null = null;

  if (body.regenerate === true) {
    rawKey = generateApiKey();
    const hashed = hashKey(rawKey);
    await admin.from("ai_settings").update({ webhook_api_key_hash: hashed }).eq("user_id", user.id);
  }

  if (typeof body.enabled === "boolean") {
    await admin.from("ai_settings").update({ webhook_enabled: body.enabled }).eq("user_id", user.id);
  }

  return NextResponse.json({
    success: true,
    api_key: rawKey,
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/lead`,
  });
}

export const dynamic = "force-dynamic";
