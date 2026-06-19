import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import twilio from "twilio";

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const triggerSource = formData.get("TriggerSource") as string;
  const usageCategory = formData.get("UsageCategory") as string;
  const usagePrice = parseFloat((formData.get("UsagePrice") as string) || "0");

  // Only respond to inbound SMS spend triggers
  if (!usageCategory?.includes("sms-inbound") && !usageCategory?.includes("SMS-Inbound")) {
    return NextResponse.json({ ignored: true });
  }

  // Only act if the trigger is a real-time alert (not a test)
  if (triggerSource !== "daily" && triggerSource !== "realtime") {
    return NextResponse.json({ ignored: true });
  }

  const admin = createAdminClient();

  // Find all Twilio integrations and detach their webhook URLs
  const { data: integrations } = await admin
    .from("integrations")
    .select("id, twilio_phone, user_id")
    .eq("provider", "twilio");

  if (!integrations?.length) {
    return NextResponse.json({ error: "No integrations found" }, { status: 404 });
  }

  const client = getTwilioClient();
  const results: { phone: string; success: boolean; error?: string }[] = [];

  for (const integration of integrations) {
    try {
      // Detach the webhook by setting it to an empty string
      // This stops Twilio from forwarding messages to our server
      const phoneNumberSid = integration.twilio_phone;
      if (!phoneNumberSid) continue;

      // Find the Twilio phone number SID from the phone number
      const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: phoneNumberSid });
      for (const num of numbers) {
        await client.incomingPhoneNumbers(num.sid).update({
          smsUrl: "",
          voiceUrl: "",
        });
        results.push({ phone: phoneNumberSid, success: true });
      }

      // Flag the integration as suspended
      await admin
        .from("integrations")
        .update({
          metadata: {
            sms_spend_suspended: true,
            sms_spend_suspended_at: new Date().toISOString(),
            sms_spend_trigger_price: usagePrice,
            sms_spend_trigger_category: usageCategory,
          },
        })
        .eq("id", integration.id);
    } catch (err: any) {
      results.push({ phone: integration.twilio_phone ?? "", success: false, error: err.message });
    }
  }

  return NextResponse.json({
    action: "webhooks_detached",
    reason: `Daily inbound SMS spend exceeded: $${usagePrice.toFixed(2)}`,
    results,
  });
}

export const runtime = "nodejs";
