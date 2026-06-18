import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function getSamples(eventType: string, userId: string) {
  const admin = createAdminClient();

  switch (eventType) {
    case "booking.created": {
      const { data } = await admin
        .from("appointments")
        .select("id, customer_name, customer_phone, start_time, end_time, status, payment_status, created_at, services(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []).map((a: any) => ({
        id: a.id,
        customer_name: a.customer_name,
        customer_phone: a.customer_phone,
        service_name: a.services?.name ?? null,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        payment_status: a.payment_status ?? "unpaid",
        created_at: a.created_at,
      }));
    }
    case "lead.created": {
      const { data } = await admin
        .from("conversations")
        .select("id, customer_name, customer_phone, channel, status, ai_active, created_at")
        .eq("user_id", userId)
        .eq("channel", "webhook")
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []).map((c: any) => ({
        id: c.id,
        customer_name: c.customer_name,
        customer_phone: c.customer_phone,
        channel: c.channel,
        status: c.status,
        ai_active: c.ai_active,
        created_at: c.created_at,
      }));
    }
    case "payment.completed": {
      const { data } = await admin
        .from("payments")
        .select("id, amount, status, paid_at, created_at, appointment_id, appointments!inner(customer_name, services(name))")
        .eq("user_id", userId)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(5);
      return (data ?? []).map((p: any) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        customer_name: p.appointments?.customer_name ?? null,
        service_name: p.appointments?.services?.name ?? null,
        paid_at: p.paid_at,
        created_at: p.created_at,
      }));
    }
    default:
      return [];
  }
}

export async function GET(request: Request) {
  const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  const admin = createAdminClient();
  const hashed = hashKey(apiKey);

  const { data: settings } = await admin
    .from("ai_settings")
    .select("user_id")
    .eq("webhook_api_key_hash", hashed)
    .maybeSingle();

  if (!settings) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get("event_type");
  if (!eventType) {
    return NextResponse.json({ error: "event_type query param required" }, { status: 400 });
  }

  const samples = await getSamples(eventType, settings.user_id);
  return NextResponse.json({ data: samples });
}

// Zapier also sends POST for sample requests
export async function POST(request: Request) {
  return GET(request);
}

export const dynamic = "force-dynamic";
