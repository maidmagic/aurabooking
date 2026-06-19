import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSMS } from "@/lib/sms/send";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: users } = await admin
    .from("users")
    .select("id, phone")
    .not("phone", "is", null);

  for (const user of (users ?? [])) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: texts }, { count: bookings }, { data: deposits }] = await Promise.all([
      admin.from("messages").select("*", { count: "exact", head: true }).eq("conversations.user_id", user.id).gte("messages.created_at", weekAgo),
      admin.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", weekAgo),
      admin.from("payments").select("amount").eq("user_id", user.id).gte("created_at", weekAgo),
    ]);

    const totalDeposits = (deposits ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

    try {
      await sendSMS({
        to: user.phone!,
        body: [
          "AuraBooking Weekly Recap",
          `📊 Handled ${texts ?? 0} messages`,
          `📅 Booked ${bookings ?? 0} appointments`,
          `💰 Secured $${(totalDeposits / 100).toFixed(2)} in deposits`,
          "— Your AI never sleeps.",
        ].join("\n"),
        type: "RECALL",
      });
    } catch {
      // Skip users without valid phone or SMS config
    }
  }

  return NextResponse.json({ sent: users?.length ?? 0 });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
