import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import twilio from "twilio";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return NextResponse.json({ error: "Twilio not configured" }, { status: 503 });
  }

  const { phoneNumber } = await request.json();
  if (!phoneNumber) {
    return NextResponse.json({ error: "phoneNumber is required" }, { status: 400 });
  }

  try {
    const client = twilio(accountSid, authToken);

    // Purchase the number & configure SMS webhook
    const incoming = await client.incomingPhoneNumbers.create({
      phoneNumber,
      smsUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://aurabooking.vercel.app"}/api/webhooks/twilio`,
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://aurabooking.vercel.app"}/api/webhooks/twilio/voice`,
      voiceMethod: "POST",
      smsMethod: "POST",
    });

    // Save to integrations table
    const { error } = await supabase.from("integrations").upsert({
      user_id: user.id,
      provider: "twilio",
      twilio_phone: incoming.phoneNumber,
      metadata: {
        twilio_sid: incoming.sid,
        purchased: true,
      },
    }, { onConflict: "user_id,provider" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      phoneNumber: incoming.phoneNumber,
      friendlyName: incoming.friendlyName,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
