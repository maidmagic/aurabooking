import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UNDELIVERABLE_CODES = new Set(["30003", "30005", "30006", "30007"]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const messageSid = formData.get("MessageSid") as string;
  const messageStatus = formData.get("MessageStatus") as string;
  const errorCode = formData.get("ErrorCode") as string;
  const to = formData.get("To") as string;

  if (!messageSid || !messageStatus || !to) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fast atomic update on delivery log
  await admin
    .from("sms_delivery_logs")
    .update({
      status: messageStatus,
      error_code: errorCode || null,
      updated_at: new Date().toISOString(),
    })
    .eq("message_sid", messageSid);

  // Flag undeliverable on linked appointment
  if (UNDELIVERABLE_CODES.has(errorCode) || messageStatus === "undelivered" || messageStatus === "failed") {
    try {
      const { data: log } = await admin
        .from("sms_delivery_logs")
        .select("appointment_id")
        .eq("message_sid", messageSid)
        .single();

      if (log?.appointment_id) {
        await admin
          .from("appointments")
          .update({ notes: `[delivery_failed] error: ${errorCode || messageStatus}` })
          .eq("id", log.appointment_id);
      }
    } catch {
      // Non-critical
    }
  }

  return NextResponse.json({ received: true });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
