import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnector } from "@/lib/pms";
import crypto from "crypto";

const PROVIDER_META: Record<string, { name: string; description: string; fields: Array<{ key: string; label: string; type: string; required: boolean }> }> = {
  opendental: {
    name: "OpenDental",
    description: "Open-source dental practice management software.",
    fields: [
      { key: "base_url", label: "OpenDental API Base URL", type: "text", required: true },
      { key: "username", label: "API Username", type: "text", required: true },
      { key: "password", label: "API Password", type: "password", required: true },
    ],
  },
  eaglesoft: {
    name: "Eaglesoft",
    description: "Dental practice management by Patterson Dental. Coming soon.",
    fields: [],
  },
  dentrix: {
    name: "Dentrix",
    description: "Dental practice management by Henry Schein. Coming soon.",
    fields: [],
  },
};

const ENCRYPTION_KEY = process.env.CRON_SECRET?.slice(0, 32).padEnd(32, "x") || "default-dev-key-please-change";

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encrypted: string): string {
  const [ivHex, encText] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: conn } = await supabase
    .from("pms_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conn) {
    return NextResponse.json({ providers: PROVIDER_META, connection: null });
  }

  return NextResponse.json({
    providers: PROVIDER_META,
    connection: {
      id: conn.id,
      provider: conn.provider,
      is_active: conn.is_active,
      last_sync_at: conn.last_sync_at,
      created_at: conn.created_at,
      config_masked: Object.keys(PROVIDER_META[conn.provider as keyof typeof PROVIDER_META]?.fields ?? {}).reduce((acc: any, key) => {
        acc[key] = conn.config[key] ? "********" : "";
        return acc;
      }, { base_url: conn.config.base_url || "" }),
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { provider, config } = body;

  if (!provider || !PROVIDER_META[provider]) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const admin = createAdminClient();

  const encryptedConfig: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string") {
      encryptedConfig[key] = encrypt(value);
    } else {
      encryptedConfig[key] = value as string;
    }
  }

  const { data: existing } = await admin
    .from("pms_connections")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await admin.from("pms_connections").update({
      provider,
      config: encryptedConfig,
      is_active: false,
    }).eq("id", existing.id);
  } else {
    await admin.from("pms_connections").insert({
      user_id: user.id,
      provider,
      config: encryptedConfig,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  await admin.from("pms_connections").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
