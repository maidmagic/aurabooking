import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user_id, business_name } = await request.json();

  if (!user_id || !business_name) {
    return NextResponse.json({ error: "user_id and business_name required" }, { status: 400 });
  }

  const slug = business_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("legal_pages")
    .select("slug")
    .eq("user_id", user_id)
    .maybeSingle();

  if (existing) {
    // Update existing record
    await admin
      .from("legal_pages")
      .update({ business_name, slug, updated_at: new Date().toISOString() })
      .eq("user_id", user_id);
  } else {
    const { error } = await admin
      .from("legal_pages")
      .insert({ user_id, business_name, slug });

    if (error) {
      // Slug collision: append a short hash
      const suffix = crypto.randomUUID().slice(0, 8);
      const uniqueSlug = `${slug}-${suffix}`;
      await admin.from("legal_pages").insert({ user_id, business_name, slug: uniqueSlug });
    }
  }

  const domain = process.env.NEXT_PUBLIC_APP_URL || "https://aurabooking.com";
  const legalUrl = `${domain}/legal/${slug}?name=${encodeURIComponent(business_name)}`;
  const twilioProofUrl = `${domain}/twilio-proof/${slug}`;

  const optInBoilerplate =
    "End-users opt in by texting the business's advertised 10DLC phone number directly to initiate a booking or inquire about services. The phone number is advertised on the business's website and physical storefront.";

  return NextResponse.json({
    slug,
    legal_url: legalUrl,
    twilio_proof_url: twilioProofUrl,
    opt_in_description: optInBoilerplate,
  });
}

export const runtime = "nodejs";
