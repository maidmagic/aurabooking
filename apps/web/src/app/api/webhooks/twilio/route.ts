import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateRequest } from "twilio/lib/webhooks/webhooks";
import twilio from "twilio";

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

const WEBHOOK_TIMEOUT_MS = 15_000;

function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get("From") as string;
  const body = (formData.get("Body") as string).trim();
  const to = formData.get("To") as string;

  if (!from || !body || !to) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Validate Twilio signature
  const twilioSignature = request.headers.get("x-twilio-signature");
  if (twilioSignature) {
    const url = `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host") || request.headers.get("x-forwarded-host")}/api/webhooks/twilio`;
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") params[key] = value;
    }
    const isValid = validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      twilioSignature,
      url,
      params
    );
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  const admin = createAdminClient();

  const { data: integration } = await admin
    .from("integrations")
    .select("*")
    .eq("twilio_phone", to)
    .single();

  if (!integration) {
    return NextResponse.json({ error: "Unrecognized number" }, { status: 404 });
  }

  const userId = integration.user_id;

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
        status: "qualifying",
      })
      .select()
      .single();
    conversation = newConv;
  }

  await admin.from("messages").insert({
    conversation_id: conversation!.id,
    role: "customer",
    content: body,
    msg_type: "text",
  });

  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation!.id);

  // Check for reminder confirm/cancel
  const normalized = body.toLowerCase().trim().replace(/[^a-z]/g, "");
  if (normalized === "confirm" || normalized === "cancel") {
    const { data: latestReminder } = await admin
      .from("reminders")
      .select("id, appointment_id")
      .eq("user_id", userId)
      .in("status", ["sent"])
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestReminder) {
      if (normalized === "confirm") {
        await admin
          .from("reminders")
          .update({ status: "confirmed" })
          .eq("id", latestReminder.id);
        await admin
          .from("appointments")
          .update({ status: "confirmed" })
          .eq("id", latestReminder.appointment_id);
      } else {
        await admin
          .from("reminders")
          .update({ status: "cancelled" })
          .eq("id", latestReminder.id);
        await admin
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", latestReminder.appointment_id);
        try {
          const client = getTwilioClient();
          await client.messages.create({
            body: "Your appointment has been cancelled. Let us know if you'd like to reschedule!",
            from: to,
            to: from,
          });
        } catch (_) {}
      }
    }
    return NextResponse.json({ conversation_id: conversation!.id });
  }

  // Trigger AI pipeline with timeout
  const { processMessage } = await import("@/lib/openai/pipeline");
  const { signal, clear } = timeoutSignal(WEBHOOK_TIMEOUT_MS);

  try {
    const reply = await processMessage(conversation!.id, userId, body, signal);

    clear();

    await admin.from("messages").insert({
      conversation_id: conversation!.id,
      role: "ai",
      content: reply,
      msg_type: "text",
    });

    // Send AI reply back via Twilio
    const client = getTwilioClient();
    await client.messages.create({
      body: reply,
      from: to,
      to: from,
    });
  } catch (err: any) {
    clear();

    // AI ghosting fail-safe: send fallback message, mark for escalation
    const fallback = "Got your request! Just checking our calendar, give us one brief second...";

    await admin.from("messages").insert({
      conversation_id: conversation!.id,
      role: "ai",
      content: fallback,
      msg_type: "text",
    });

    await admin
      .from("conversations")
      .update({ status: "active", metadata: { needs_human: true, error: err.message } })
      .eq("id", conversation!.id);

    // Send fallback SMS
    try {
      const client = getTwilioClient();
      await client.messages.create({
        body: fallback,
        from: to,
        to: from,
      });
    } catch (_) {
      // Best-effort — SMS failure is non-fatal
    }
  }

  return NextResponse.json({ conversation_id: conversation!.id });
}
