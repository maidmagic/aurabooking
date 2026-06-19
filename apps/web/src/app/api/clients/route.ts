import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const lastVisit = searchParams.get("lastVisit"); // "6months" | "1year"

  let query = supabase
    .from("customer_profiles")
    .select("*")
    .eq("user_id", user.id);

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  if (lastVisit === "6months") {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    query = query.lt("last_appointment_at", cutoff.toISOString());
  } else if (lastVisit === "1year") {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    query = query.lt("last_appointment_at", cutoff.toISOString());
  }

  const { data, error } = await query.order("last_appointment_at", {
    ascending: false,
    nullsFirst: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const clients = (data ?? []).map((c: any) => ({
    id: c.phone,
    phone: c.phone,
    name: c.name,
    total_cancellations: c.total_cancellations ?? 0,
    last_appointment_at: c.last_appointment_at,
    is_subscribed: c.is_subscribed ?? true,
    created_at: c.created_at,
  }));

  return NextResponse.json(clients);
}
