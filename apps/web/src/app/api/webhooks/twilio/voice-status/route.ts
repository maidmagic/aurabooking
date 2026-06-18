import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import twilio from "twilio";

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const dialCallStatus = formData.get("DialCallStatus") as string;
  const from = formData.get("From") as string;
  const to = formData.get("To") as string;

  if (dialCallStatus !== "no-answer" || !from || !to) {
    return NextResponse.json({});
  }

  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("integrations")
    .select("user_id, metadata")
    .eq("twilio_phone", to)
    .single();

  if (!integration) return NextResponse.json({});

  const userId = integration.user_id;
  const missedCallEnabled = integration.metadata?.missed_call_enabled;
  const missedCallMessage =
    (integration.metadata?.missed_call_message as string) ||
    "We missed your call! Text us back and we'll help you out.";

  if (missedCallEnabled === false) return NextResponse.json({});

  // Find or create conversation
  let { data: conversation } = await admin
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("customer_phone", from)
    .single();

  if (!conversation) {
    const { data: newConv } = await admin
      .from("conversations")
      .insert({
        user_id: userId,
        channel: "sms",
        customer_phone: from,
        status: "active",
      })
      .select()
      .single();
    conversation = newConv;
  }

  // Store the auto-text as a message
  await admin.from("messages").insert({
    conversation_id: conversation!.id,
    role: "ai",
    content: missedCallMessage,
    msg_type: "text",
  });

  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation!.id);

  // Send SMS
  try {
    const client = getTwilioClient();
    await client.messages.create({
      body: missedCallMessage,
      from: to,
      to: from,
    });
  } catch (err) {
    console.error("Failed to send missed call SMS:", err);
  }

  return NextResponse.json({});
}
