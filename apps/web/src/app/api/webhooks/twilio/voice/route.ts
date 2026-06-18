import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const formData = await request.formData();
  const to = formData.get("To") as string;

  if (!to) {
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Reject/></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("integrations")
    .select("metadata")
    .eq("twilio_phone", to)
    .single();

  const forwardPhone = integration?.metadata?.forward_phone as string | undefined;

  if (!forwardPhone) {
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Reject/></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const webhookBase = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get("host")}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="15" action="${webhookBase}/api/webhooks/twilio/voice-status">
    <Number>${forwardPhone}</Number>
  </Dial>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
