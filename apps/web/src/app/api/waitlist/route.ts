import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "active";

  const admin = (await import("@/lib/supabase/admin")).createAdminClient();
  const { data } = await admin
    .from("waitlist")
    .select("*, services(name)")
    .eq("user_id", user.id)
    .eq("status", status)
    .order("created_at", { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const admin = (await import("@/lib/supabase/admin")).createAdminClient();
  const { data, error } = await admin
    .from("waitlist")
    .insert({ ...body, user_id: user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  const admin = (await import("@/lib/supabase/admin")).createAdminClient();
  await admin.from("waitlist").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
