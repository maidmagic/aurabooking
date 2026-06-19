import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase
    .from("review_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!settings) {
    return NextResponse.json({
      enabled: false,
      business_name: "",
      google_review_url: "",
      feedback_gate_enabled: true,
      initial_delay_minutes: 120,
      follow_up_delay_minutes: 1440,
    });
  }

  return NextResponse.json({
    enabled: settings.enabled,
    business_name: settings.business_name,
    google_review_url: settings.google_review_url,
    feedback_gate_enabled: settings.feedback_gate_enabled,
    initial_delay_minutes: settings.initial_delay_minutes,
    follow_up_delay_minutes: settings.follow_up_delay_minutes,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const updates: Record<string, any> = {};

  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
  if (typeof body.business_name === "string") updates.business_name = body.business_name;
  if (typeof body.google_review_url === "string") updates.google_review_url = body.google_review_url;
  if (typeof body.feedback_gate_enabled === "boolean") updates.feedback_gate_enabled = body.feedback_gate_enabled;
  if (typeof body.initial_delay_minutes === "number") updates.initial_delay_minutes = body.initial_delay_minutes;
  if (typeof body.follow_up_delay_minutes === "number") updates.follow_up_delay_minutes = body.follow_up_delay_minutes;

  await admin.from("review_settings").update(updates).eq("user_id", user.id);

  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
