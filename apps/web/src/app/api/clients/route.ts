import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const lastVisit = searchParams.get("lastVisit");
  const sort = searchParams.get("sort") || "alpha"; // "alpha" | "recent"

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

  if (sort === "alpha") {
    query = query.order("name", { ascending: true, nullsFirst: false });
  } else {
    query = query.order("last_appointment_at", { ascending: false, nullsFirst: false });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const clients = (data ?? []).map((c: any) => ({
    id: c.phone,
    phone: c.phone,
    name: c.name,
    email: c.email,
    insurance_provider: c.insurance_provider,
    insurance_id: c.insurance_id,
    notes: c.notes,
    date_of_birth: c.date_of_birth,
    total_cancellations: c.total_cancellations ?? 0,
    late_cancellations: c.late_cancellations ?? 0,
    last_appointment_at: c.last_appointment_at,
    is_subscribed: c.is_subscribed ?? true,
    created_at: c.created_at,
  }));

  return NextResponse.json(clients);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { phone, name, email, insurance_provider, insurance_id, notes, date_of_birth } = body;

  if (!phone) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("customer_profiles")
    .upsert({
      phone,
      user_id: user.id,
      name: name ?? null,
      email: email ?? null,
      insurance_provider: insurance_provider ?? null,
      insurance_id: insurance_id ?? null,
      notes: notes ?? null,
      date_of_birth: date_of_birth ?? null,
    }, { onConflict: "phone,user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
