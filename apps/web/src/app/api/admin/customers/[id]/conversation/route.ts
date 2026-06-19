import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const { id: customerPhone } = await params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id");

  if (!tenantId || !customerPhone) {
    return NextResponse.json({ error: "Missing tenant_id or customer phone" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find conversations for this customer profile
  const { data: conversations, error: convErr } = await admin
    .from("conversations")
    .select("id")
    .eq("user_id", tenantId)
    .eq("customer_phone", customerPhone)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (convErr) {
    return NextResponse.json({ error: convErr.message }, { status: 500 });
  }

  if (!conversations || conversations.length === 0) {
    return NextResponse.json([]);
  }

  const conversationIds = conversations.map((c: { id: string }) => c.id);

  const { data: messages, error: msgErr } = await admin
    .from("messages")
    .select("id, role, content, created_at, msg_type, metadata")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  // Map role to direction for the UI
  const mapped = (messages ?? []).map((m: any) => ({
    id: m.id,
    direction: m.role === "customer" ? "inbound" : "outbound",
    body: m.content,
    created_at: m.created_at,
    msg_type: m.msg_type,
    metadata: m.metadata,
  }));

  return NextResponse.json(mapped);
}
