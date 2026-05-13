import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generate a Stripe Customer Portal session for the signed-in user and
 * return its URL. The settings page redirects the browser there.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow?.stripe_customer_id) {
    return NextResponse.json(
      { error: "You don't have a billing account yet. Subscribe first." },
      { status: 400 },
    );
  }

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: userRow.stripe_customer_id,
      return_url: `${env.siteUrl()}/dashboard/settings`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Stripe portal session failed", err);
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 500 });
  }
}
