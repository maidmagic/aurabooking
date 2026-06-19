import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check paid plan
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();

  if (!sub || sub.plan === "free" || sub.status !== "active") {
    return NextResponse.json({ error: "Paid subscription required" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Check if already voted — toggle
  const { data: existing } = await admin
    .from("suggestion_upvotes")
    .select("id")
    .eq("suggestion_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await admin.from("suggestion_upvotes").delete().eq("id", existing.id);
    return NextResponse.json({ voted: false });
  }

  await admin.from("suggestion_upvotes").insert({
    suggestion_id: id,
    user_id: user.id,
  });

  return NextResponse.json({ voted: true });
}

export const dynamic = "force-dynamic";
