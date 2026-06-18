import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let twilioPhone: string;
  let forwardPhone: string | undefined;
  let missedCallMessage: string | undefined;
  let missedCallEnabled: boolean | undefined;
  try {
    const body = await request.json();
    twilioPhone = body.twilioPhone;
    forwardPhone = body.forwardPhone;
    missedCallMessage = body.missedCallMessage;
    missedCallEnabled = body.missedCallEnabled;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!twilioPhone || typeof twilioPhone !== "string") {
    return NextResponse.json({ error: "twilioPhone is required" }, { status: 400 });
  }

  const { error } = await supabase.from("integrations").upsert({
    user_id: user.id,
    provider: "twilio",
    twilio_phone: twilioPhone,
    metadata: {
      forward_phone: forwardPhone ?? "",
      missed_call_message: missedCallMessage ?? "We missed your call! Text us back and we'll help you out.",
      missed_call_enabled: missedCallEnabled ?? true,
    },
  }, { onConflict: "user_id,provider" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
