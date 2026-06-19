import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  await admin
    .from("pms_connections")
    .update({ is_active: body.active ?? true })
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
