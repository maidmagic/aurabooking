import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: users, error: lookupErr } = await admin
    .from("users")
    .select("id, email")
    .eq("email", email.toLowerCase())
    .limit(1);

  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }

  if (!users || users.length === 0) {
    return NextResponse.json(
      { error: "No user found with that email. Register first at /auth/register." },
      { status: 404 }
    );
  }

  const userId = users[0].id;

  const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role: "super_admin" },
  });

  if (metaErr) {
    return NextResponse.json({ error: metaErr.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Admin access granted", email: users[0].email });
}
