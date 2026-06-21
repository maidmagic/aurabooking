import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { secretKey } = await request.json();
  if (!secretKey) {
    return NextResponse.json({ error: "secretKey is required" }, { status: 400 });
  }

  if (!secretKey.startsWith("sk_live_") && !secretKey.startsWith("sk_test_")) {
    return NextResponse.json({ error: "Invalid key format. Must start with sk_live_ or sk_test_." }, { status: 400 });
  }

  try {
    const client = new Stripe(secretKey);
    const accounts = await client.accounts.list({ limit: 1 });
    const account = accounts.data[0];

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        stripe_connected: true,
        stripe_account_id: account.id,
        stripe_payouts_enabled: account.payouts_enabled,
        stripe_charges_enabled: account.charges_enabled,
      },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      account_id: account.id,
      payouts_enabled: account.payouts_enabled,
      charges_enabled: account.charges_enabled,
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Stripe key rejected: ${e.message}` }, { status: 400 });
  }
}

export const runtime = "nodejs";
