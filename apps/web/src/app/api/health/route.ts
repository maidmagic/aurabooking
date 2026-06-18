import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabaseOk = await checkSupabase();
  
  return NextResponse.json({
    checks: {
      supabase: supabaseOk,
      twilio: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY,
      cron: !!process.env.CRON_SECRET,
    },
    timestamp: new Date().toISOString(),
  });
}

async function checkSupabase() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("users").select("id", { count: "exact", head: true });
    return !error;
  } catch { return false; }
}

export const dynamic = "force-dynamic";
