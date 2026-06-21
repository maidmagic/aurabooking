import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meta = user.user_metadata ?? {};
  return NextResponse.json({
    onboarding_step: meta.onboarding_step ?? "pending",
    human_in_the_loop: meta.human_in_the_loop ?? true,
    stripe_connected: meta.stripe_connected ?? false,
    email: user.email,
  });
}
