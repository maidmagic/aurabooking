import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: review } = await admin
    .from("review_requests")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (review) {
    await admin
      .from("review_requests")
      .update({ status: "clicked", clicked_at: new Date().toISOString() })
      .eq("id", id);

    const { data: settings } = await admin
      .from("review_settings")
      .select("google_review_url")
      .eq("user_id", review.user_id)
      .single();

    if (settings?.google_review_url) {
      redirect(settings.google_review_url);
    }
  }

  redirect("https://g.page/review");
}

export const dynamic = "force-dynamic";
