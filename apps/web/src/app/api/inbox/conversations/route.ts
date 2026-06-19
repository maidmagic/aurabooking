import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("conversations")
    .select("id, channel, customer_name, customer_phone, status, ai_active, metadata, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const conversationsWithPreview = await Promise.all(
    (data ?? []).map(async (conv) => {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, role, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...conv,
        last_message: lastMsg?.content ?? null,
        last_message_role: lastMsg?.role ?? null,
        last_message_at: lastMsg?.created_at ?? null,
      };
    })
  );

  return NextResponse.json(conversationsWithPreview);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ai_active, status, clear_flag } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, any> = {};
  if (typeof ai_active === "boolean") updates.ai_active = ai_active;
  if (status) updates.status = status;
  if (clear_flag) updates.metadata = {};

  const { error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
