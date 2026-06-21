import { NextResponse } from "next/server";
import twilio from "twilio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const areaCode = searchParams.get("areaCode") || "212";

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return NextResponse.json({ error: "Twilio not configured" }, { status: 503 });
  }

  try {
    const client = twilio(accountSid, authToken);
    const available = await client.availablePhoneNumbers("US").local.list({
      areaCode: parseInt(areaCode),
      limit: 10,
      voiceEnabled: true,
      smsEnabled: true,
    });

    const numbers = available.map((n: any) => ({
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      locality: n.locality,
      region: n.region,
      price: n.price || "1.00",
    }));

    return NextResponse.json({ numbers });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
