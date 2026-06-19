import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnector } from "@/lib/pms";
import type { PMSConfig } from "@/lib/pms";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.CRON_SECRET?.slice(0, 32).padEnd(32, "x") || "default-dev-key-please-change";

function decrypt(encrypted: string): string {
  const [ivHex, encText] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("pms_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!conn) return NextResponse.json({ error: "No PMS connection configured" }, { status: 400 });

  const decryptedConfig: Record<string, string> = {};
  for (const [key, value] of Object.entries(conn.config as Record<string, string>)) {
    decryptedConfig[key] = decrypt(value);
  }

  try {
    const connector = getConnector(conn.provider, decryptedConfig as PMSConfig);
    const result = await connector.testConnection();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message });
  }
}

export const dynamic = "force-dynamic";
