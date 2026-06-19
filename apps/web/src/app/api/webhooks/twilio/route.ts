import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateRequest } from "twilio/lib/webhooks/webhooks";
import twilio from "twilio";
import { sendSMS, optOutFooter } from "@/lib/sms/send";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { checkLoop } from "@/lib/circuit-breakers/loop-detector";
import { acquireConversationLock, releaseConversationLock, queueMessage, drainQueue } from "@/lib/circuit-breakers/conversation-lock";

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

const WEBHOOK_TIMEOUT_MS = 10_000;

function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

const CTIA_OPTOUT_KEYWORDS = ["stop", "cancel", "unsubscribe"];

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get("From") as string;
  const body = (formData.get("Body") as string).trim();
  const to = formData.get("To") as string;

  if (!from || !body || !to) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Rate limit per sender number (20 msgs per 60s window)
  const rateCheck = await checkRateLimit(`twilio:${from}`, 20, 60_000);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  // Validate Twilio signature
  const twilioSignature = request.headers.get("x-twilio-signature");
  if (twilioSignature) {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://aurabooking.com"}/api/webhooks/twilio`;
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") params[key] = value;
    }
    const isValid = validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      twilioSignature,
      webhookUrl,
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

  // Fetch business phone for fallback SMS
  const { data: userProfile } = await admin
    .from("users")
    .select("phone, company_name")
    .eq("id", userId)
    .single();
  const fallbackSms = userProfile?.phone
    ? `We are experiencing high message volume right now! Please call ${userProfile.phone} or we will text you back shortly.`
    : "We are experiencing high message volume right now! A team member has been notified and will respond shortly.";

  // ── CTIA keyword handling ──
  // Must be checked before any conversation logic, before any response.
  const strippedBody = body.replace(/[^a-zA-Z]/g, "").toLowerCase().trim();

  if (CTIA_OPTOUT_KEYWORDS.includes(strippedBody)) {
    await admin.from("opt_outs").upsert({ phone: from }, { onConflict: "phone" });
    await admin.from("customer_profiles").update({ is_subscribed: false }).eq("phone", from).eq("user_id", userId);
    try {
      const client = getTwilioClient();
      await client.messages.create({
        body: "You have been unsubscribed from all messages. Reply START to resume.",
        from: to,
        to: from,
      });
    } catch {}
    return NextResponse.json({ opt_out: true });
  }

  if (strippedBody === "start" || strippedBody === "unstop") {
    await admin.from("opt_outs").delete().eq("phone", from);
    await admin.from("customer_profiles").update({ is_subscribed: true }).eq("phone", from).eq("user_id", userId);
    try {
      const client = getTwilioClient();
      await client.messages.create({
        body: "You have been resubscribed. Reply STOP to opt out again at any time.",
        from: to,
        to: from,
      });
    } catch {}
    return NextResponse.json({ opt_out: false });
  }

  if (strippedBody === "help") {
    try {
      const client = getTwilioClient();
      await client.messages.create({
        body: "This is a business messaging account. Reply STOP to opt out of all messages, or just tell us how we can help!",
        from: to,
        to: from,
      });
    } catch {}
    return NextResponse.json({ help_sent: true });
  }

  // ── Opt-out gate: silently drop messages from already-opted-out numbers ──
  const { data: existingOptOut } = await admin
    .from("opt_outs")
    .select("phone")
    .eq("phone", from)
    .maybeSingle();

  if (existingOptOut) {
    return NextResponse.json({ ignored: true });
  }

  // ── End CTIA — normal flow ──

  let { data: conversation } = await admin
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("customer_phone", from)
    .single();

  const isNewConversation = !conversation;

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

  // ── Check for reminder confirm/cancel ──
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
        await sendSMS({
          to: from,
          body: "Your appointment has been cancelled. Let us know if you'd like to reschedule!",
          type: "RESCUE",
        });

        // Track cancellation in customer profile
        const { data: existingProfile } = await admin
          .from("customer_profiles")
          .select("total_cancellations, late_cancellations")
          .eq("phone", from)
          .eq("user_id", userId)
          .maybeSingle();

        if (existingProfile) {
          await admin
            .from("customer_profiles")
            .update({
              total_cancellations: (existingProfile.total_cancellations ?? 0) + 1,
              late_cancellations: (existingProfile.late_cancellations ?? 0) + 1,
            })
            .eq("phone", from)
            .eq("user_id", userId);
        } else {
          await admin
            .from("customer_profiles")
            .insert({
              phone: from,
              user_id: userId,
              name: "",
              total_cancellations: 1,
              late_cancellations: 1,
            });
        }

        // Also mark the appointment's cancelled_at and cancellation_type
        const { data: latestReminder2 } = await admin
          .from("reminders")
          .select("appointment_id")
          .eq("user_id", userId)
          .in("status", ["sent"])
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestReminder2?.appointment_id) {
          await admin
            .from("appointments")
            .update({
              cancelled_at: new Date().toISOString(),
              cancellation_type: "late",
            })
            .eq("id", latestReminder2.appointment_id);
        }
      }
    }
    return NextResponse.json({ conversation_id: conversation!.id });
  }

  // ── Check for review rating (single digit 1-5) ──
  const ratingMatch = body.match(/^\s*([1-5])\s*$/);
  if (ratingMatch) {
    const rating = parseInt(ratingMatch[1]);

    if (conversation) {
      const { data: pendingRequest } = await admin
        .from("review_requests")
        .select("id, user_id")
        .eq("user_id", userId)
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingRequest) {
        await admin
          .from("review_requests")
          .update({ rating, status: "completed" })
          .eq("id", pendingRequest.id);

        const { data: settings } = await admin
          .from("review_settings")
          .select("feedback_gate_enabled, google_review_url, business_name")
          .eq("user_id", pendingRequest.user_id)
          .single();

        if (rating >= 4 && settings?.google_review_url) {
          const baseDomain = process.env.SHORT_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const shortLink = `${baseDomain}/r/${pendingRequest.id}`;
          await admin.from("messages").insert({
            conversation_id: conversation.id,
            role: "ai",
            content: `Thanks for the ${rating}-star rating! If you'd like to leave a Google review, here's the link: ${shortLink}`,
          });

          await sendSMS({
            to: from,
            body: `Thanks for the ${rating}-star rating! Leave us a review here: ${shortLink}`,
            type: "RECALL",
          });
        } else if (rating < 4 && settings?.business_name) {
          await admin.from("messages").insert({
            conversation_id: conversation.id,
            role: "ai",
            content: `Thanks for your honest feedback (${rating}/5). We're always looking to improve. Would you like to share more details with our team?`,
          });
        } else {
          await admin.from("messages").insert({
            conversation_id: conversation.id,
            role: "ai",
            content: `Thanks for your ${rating}-star rating!`,
          });
        }

        return NextResponse.json({ conversation_id: conversation.id, rating });
      }
    }
  }

  // ── Loop detection circuit breaker ──
  const loopCheck = await checkLoop(conversation!.id);
  if (loopCheck.isLoop) {
    const { data: convMeta } = await admin
      .from("conversations")
      .select("metadata")
      .eq("id", conversation!.id)
      .single();
    const mergedMeta = { ...(convMeta?.metadata as Record<string, any> ?? {}), flagged_by: "loop_detector", needs_human: true };
    await admin
      .from("conversations")
      .update({ metadata: mergedMeta })
      .eq("id", conversation!.id);

    await admin.from("messages").insert({
      conversation_id: conversation!.id,
      role: "ai",
      content: fallbackSms,
      msg_type: "text",
    });
    await sendSMS({
      to: from,
      body: fallbackSms,
      type: "RESCUE",
    });
    return NextResponse.json({ conversation_id: conversation!.id, loop_detected: true });
  }

  // ── Distributed lock: prevent double-text race condition ──
  const lockAcquired = await acquireConversationLock(conversation!.id);
  if (!lockAcquired) {
    // Another webhook is processing this conversation — queue this message
    await queueMessage(conversation!.id, body);
    return NextResponse.json({ conversation_id: conversation!.id, queued: true });
  }

  // ── Trigger AI pipeline with timeout ──
  const { processMessage } = await import("@/lib/openai/pipeline");

  async function runPipeline(msgBody: string): Promise<void> {
    const { signal, clear } = timeoutSignal(WEBHOOK_TIMEOUT_MS);
    try {
      const reply = await processMessage(conversation!.id, userId, msgBody, signal);
      clear();

      const footer = isNewConversation ? optOutFooter() : "";

      await admin.from("messages").insert({
        conversation_id: conversation!.id,
        role: "ai",
        content: reply,
        msg_type: "text",
      });

      await sendSMS({
        to: from,
        body: reply + footer,
        type: "RESCUE",
      });

      if (isNewConversation) {
        await admin.from("conversations").update({ opt_out_footer_sent: true }).eq("id", conversation!.id);
      }
    } catch (err: any) {
      clear();

      logAudit({
        userId,
        action: "ai.pipeline.error",
        resource: "conversations",
        resourceId: conversation!.id,
        metadata: { error: err.message },
      });

      await admin.from("messages").insert({
        conversation_id: conversation!.id,
        role: "ai",
        content: fallbackSms,
        msg_type: "text",
      });

      const { data: convMeta } = await admin
        .from("conversations")
        .select("metadata")
        .eq("id", conversation!.id)
        .single();
      const mergedMeta = { ...(convMeta?.metadata as Record<string, any> ?? {}), needs_human: true, error: err.message };
      await admin
        .from("conversations")
        .update({ status: "active", metadata: mergedMeta })
        .eq("id", conversation!.id);

      await sendSMS({
        to: from,
        body: fallbackSms,
        type: "RESCUE",
      });
    }
  }

  await runPipeline(body);

  // Drain any messages queued while lock was held
  const queued = await drainQueue(conversation!.id);
  for (const queuedBody of queued) {
    // Caller is no longer waiting on this — send SMS response directly
    await runPipeline(queuedBody);
  }

  await releaseConversationLock(conversation!.id);

  return NextResponse.json({ conversation_id: conversation!.id });
}

export const runtime = "nodejs";
