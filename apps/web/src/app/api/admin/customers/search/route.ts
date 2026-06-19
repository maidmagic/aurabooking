import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().toLowerCase() || "";
  const tenantId = searchParams.get("tenant_id");

  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
  }
  if (!query) {
    return NextResponse.json([]);
  }

  const admin = createAdminClient();

  const cleanPhoneQuery = query.replace(/[\s\-\(\)\+]/g, "");

  let dbQuery = admin
    .from("customer_profiles")
    .select("phone, name, late_cancellations, created_at")
    .eq("user_id", tenantId)
    .limit(20);

  if (/^\d+$/.test(cleanPhoneQuery)) {
    dbQuery = dbQuery.ilike("phone", `%${cleanPhoneQuery}%`);
  } else {
    dbQuery = dbQuery.ilike("name", `%${query}%`);
  }

  const { data: customers, error } = await dbQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(customers);
}
