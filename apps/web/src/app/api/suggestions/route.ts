import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: suggestions } = await admin
    .from("suggestions")
    .select("id, user_id, title, body, status, created_at, users(email)")
    .order("created_at", { ascending: false });

  // Get upvote counts and current user's votes
  const { data: upvotes } = await admin
    .from("suggestion_upvotes")
    .select("suggestion_id, user_id");

  const upvoteMap = new Map<string, number>();
  const userUpvoteSet = new Set<string>();

  for (const uv of (upvotes ?? [])) {
    upvoteMap.set(uv.suggestion_id, (upvoteMap.get(uv.suggestion_id) ?? 0) + 1);
    if (uv.user_id === user.id) userUpvoteSet.add(uv.suggestion_id);
  }

  const result = (suggestions ?? []).map((s) => ({
    id: s.id,
    user_id: s.user_id,
    title: s.title,
    body: s.body,
    status: s.status,
    created_at: s.created_at,
    author_email: (s as any).users?.email ?? "unknown",
    upvotes: upvoteMap.get(s.id) ?? 0,
    user_voted: userUpvoteSet.has(s.id),
  }));

  // Sort by upvotes descending
  result.sort((a, b) => b.upvotes - a.upvotes);

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check paid plan
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();

  if (!sub || sub.plan === "free" || sub.status !== "active") {
    return NextResponse.json({ error: "Paid subscription required" }, { status: 403 });
  }

  const { title, body } = await request.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("suggestions")
    .insert({ user_id: user.id, title: title.trim(), body: body?.trim() ?? "" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export const dynamic = "force-dynamic";
