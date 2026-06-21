import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, services(name)")
    .eq("user_id", user.id)
    .in("status", ["confirmed", "booked", "cancelled", "completed", "rescheduled"])
    .order("start_time", { ascending: true });

  return NextResponse.json(appointments ?? []);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, status, start_time, end_time } = body;
  if (!id) return NextResponse.json({ error: "Missing appointment id" }, { status: 400 });

  const update: Record<string, string> = {};
  if (status) update.status = status;
  if (start_time) update.start_time = start_time;
  if (end_time) update.end_time = end_time;

  const { error } = await supabase
    .from("appointments")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
