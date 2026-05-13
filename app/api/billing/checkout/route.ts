import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { resolveStripePriceId } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionInterval, SubscriptionPlan } from "@/types/database";

interface CheckoutBody {
  plan: Exclude<SubscriptionPlan, "free">;
  interval: SubscriptionInterval;
}

function validate(raw: unknown): CheckoutBody | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (b.plan !== "pro" && b.plan !== "business") return null;
  if (b.interval !== "monthly" && b.interval !== "annual") return null;
  return { plan: b.plan, interval: b.interval };
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = validate(await req.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Invalid plan or interval" }, { status: 400 });
  }

  // Look up the user's existing stripe_customer_id so we can reuse it.
  // If they're a brand new subscriber Stripe creates one for us when we
  // pass customer_email instead.
  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const priceId = resolveStripePriceId(body.plan, body.interval, env);
  const stripe = getStripe();
  const siteUrl = env.siteUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
      client_reference_id: user.id,
      // Hand Stripe whichever customer identifier we have; never both.
      ...(userRow?.stripe_customer_id
        ? { customer: userRow.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      allow_promotion_codes: true,
      subscription_data: {
        // Tag the subscription so the webhook can verify it belongs to us.
        metadata: { app_user_id: user.id, plan: body.plan, interval: body.interval },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Checkout session has no URL" }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Stripe checkout creation failed", err);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
