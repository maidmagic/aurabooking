import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const checks: Record<string, string | boolean> = {};

  // Supabase
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("users").select("id", { count: "exact", head: true });
    checks.supabase = error ? `error: ${error.message}` : true;
  } catch (e: any) {
    checks.supabase = `exception: ${e.message}`;
  }

  // Env vars present
  checks.twilio = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN;
  checks.stripe = !!process.env.STRIPE_SECRET_KEY;
  checks.openrouter = !!process.env.OPENROUTER_API_KEY;
  checks.supabase_key = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  checks.cron_secret = !!process.env.CRON_SECRET;
  checks.sentry = !!process.env.SENTRY_DSN;

  // Node version
  checks.node = process.version;

  // Overall status
  const allOk = Object.values(checks).every((v) => v === true);
  const statusCode = allOk ? 200 : 503;

  return NextResponse.json({
    status: allOk ? "healthy" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  }, { status: statusCode });
}

export const dynamic = "force-dynamic";
