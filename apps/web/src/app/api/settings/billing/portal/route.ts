import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = subscription?.stripe_customer_id;

  // If no customer record yet, create one from the user
  if (!customerId) {
    const { data: profile } = await supabase
      .from("users")
      .select("email, company_name")
      .eq("id", user.id)
      .single();

    const customer = await getStripe().customers.create({
      email: profile?.email || user.email,
      name: profile?.company_name || undefined,
      metadata: { user_id: user.id },
    });

    customerId = customer.id;

    // Store it for next time
    if (subscription) {
      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customer.id })
        .eq("user_id", user.id);
    }
  }

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
