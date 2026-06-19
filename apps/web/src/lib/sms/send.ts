import twilio from "twilio";
import { verifyTenantAccess } from "@/lib/tenant-gate";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
  }
  return twilio(accountSid, authToken, { autoRetry: true, timeout: 4000 });
}

export type MessageType = "OTP" | "RESCUE" | "RECALL";

const VALIDITY_PERIODS: Record<MessageType, number> = {
  OTP: 120,
  RESCUE: 900,
  RECALL: 14400,
};

interface SendSMSPayload {
  to: string;
  body: string;
  type: MessageType;
  idempotencyKey?: string;
  tenantId?: string;
  appointmentId?: string;
}

export async function sendSMS({ to, body, type, idempotencyKey, tenantId, appointmentId }: SendSMSPayload) {
  // Tenant resource gate — skip on auth-related traffic (OTP)
  if (tenantId && type !== "OTP") {
    const gate = await verifyTenantAccess(tenantId, "SMS");
    if (!gate.allowed) {
      return { success: false, sid: null, error: { code: 403, message: `SMS blocked: ${gate.reason}`, status: 403 } };
    }
  }
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!messagingServiceSid) {
    return { success: false, sid: null, error: { code: 500, message: "Missing TWILIO_MESSAGING_SERVICE_SID", status: 500 } };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aurabooking.com";

  try {
    const client = getTwilioClient();
    const message = await client.messages.create({
      to,
      body,
      messagingServiceSid,
      validityPeriod: VALIDITY_PERIODS[type],
      statusCallback: `${appUrl}/api/webhooks/twilio/status`,
      ...(idempotencyKey && { clientReference: idempotencyKey }),
    });

    // Write delivery tracking row — fire-and-forget (non-blocking)
    if (message.sid) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      void admin.from("sms_delivery_logs").insert({
        message_sid: message.sid,
        tenant_id: tenantId || null,
        appointment_id: appointmentId || null,
        status: message.status || "queued",
      });
      // Track SMS usage against tenant quota
      if (tenantId) {
        void admin.rpc("increment_usage", { p_user_id: tenantId, p_resource: "sms", p_amount: 1 });
      }
    }

    return {
      success: true,
      sid: message.sid,
      status: message.status,
    };
  } catch (error: any) {
    return {
      success: false,
      sid: null,
      error: {
        code: error.code || 500,
        message: error.message || "Unknown network execution error.",
        status: error.status || 500,
      },
    };
  }
}

export function optOutFooter(): string {
  return "\n\nReply HELP for info, STOP to opt out.";
}
