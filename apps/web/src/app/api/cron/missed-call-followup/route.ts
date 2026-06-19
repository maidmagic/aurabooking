import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSMS } from "@/lib/sms/send";

/** Lost Lead Protocol — 3-step persistence ladder for missed calls:
 *  Step 1 (immediate): sent by voice-status webhook at time of call
 *  Step 2 (15 min):   "Just wanted to see if you still needed help..."
 *  Step 3 (24 hours): "I'll let you go for now, but feel free to text..."
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // Find conversations created by missed calls with no customer reply yet
  const { data: integrations } = await admin
    .from("integrations")
    .select("user_id, twilio_phone, metadata")
    .eq("provider", "twilio")
    .not("twilio_phone", "is", null);

  let step2Sent = 0;
  let step3Sent = 0;

  for (const integration of (integrations ?? [])) {
    const userId = integration.user_id;
    const missedCallEnabled = integration.metadata?.missed_call_enabled;
    if (missedCallEnabled === false) continue;

    // Find conversations that started via missed call (status "active", channel sms, no customer messages)
    const { data: conversations } = await admin
      .from("conversations")
      .select("id, customer_phone, created_at, missed_call_followup_15min, missed_call_followup_24h")
      .eq("user_id", userId)
      .eq("channel", "sms")
      .eq("status", "active")
      .not("customer_phone", "is", null);

    for (const conv of (conversations ?? [])) {
      // Only follow up if customer hasn't replied yet (only AI messages in the conversation)
      const { data: msgCheck } = await admin
        .from("messages")
        .select("role")
        .eq("conversation_id", conv.id)
        .eq("role", "customer")
        .limit(1);

      if (msgCheck && msgCheck.length > 0) continue; // customer replied — stop followups

      const elapsed = now.getTime() - new Date(conv.created_at).getTime();
      const fifteenMin = 15 * 60 * 1000;
      const twentyFourH = 24 * 60 * 60 * 1000;

      // Step 2: 15 minutes later
      if (elapsed >= fifteenMin && !conv.missed_call_followup_15min) {
        const result = await sendSMS({
          to: conv.customer_phone!,
          body: "Just wanted to see if you still needed help with that booking? I have a few slots open tomorrow.",
          type: "RESCUE",
        });

        if (result.success) {
          await admin.from("messages").insert({
            conversation_id: conv.id,
            role: "ai",
            content: "Just wanted to see if you still needed help with that booking? I have a few slots open tomorrow.",
            msg_type: "text",
          });

          await admin
            .from("conversations")
            .update({ missed_call_followup_15min: true })
            .eq("id", conv.id);
          step2Sent++;
        }
      }

      // Step 3: 24 hours later
      if (elapsed >= twentyFourH && !conv.missed_call_followup_24h) {
        const result = await sendSMS({
          to: conv.customer_phone!,
          body: "I'll let you go for now, but feel free to text this number anytime you're ready to book. Have a great day!",
          type: "RESCUE",
        });

        if (result.success) {
          await admin.from("messages").insert({
            conversation_id: conv.id,
            role: "ai",
            content: "I'll let you go for now, but feel free to text this number anytime you're ready to book. Have a great day!",
            msg_type: "text",
          });

          await admin
            .from("conversations")
            .update({ missed_call_followup_24h: true })
            .eq("id", conv.id);
          step3Sent++;
        }
      }
    }
  }

  return NextResponse.json({ step2_sent: step2Sent, step3_sent: step3Sent });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
