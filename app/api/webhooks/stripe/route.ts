import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { getStripe, identifyPlanFromSubscription, mapStripeSubscriptionStatus } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/types/database";

// Stripe needs the raw bytes to verify the signature. Next.js parses the
// body for us on most routes; opting out for this one is essential or
// constructEvent throws a SignatureVerificationError every time.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChanged(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        // Ignore everything else for now. Stripe will retry on non-2xx, so
        // returning 200 for unhandled types keeps the event log clean.
        break;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Stripe webhook handler failed", { type: event.type, err });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Fired after a successful Checkout session. We use it to associate the
 * Stripe customer id with our user row. The actual subscription state is
 * synced via the subscription events below.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.client_reference_id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!userId || !customerId) return;

  const admin = createAdminClient();
  await admin.from("users").update({ stripe_customer_id: customerId }).eq("id", userId);
}

async function handleSubscriptionChanged(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const planAndInterval = identifyPlanFromSubscription(subscription, getConfiguredPrices());
  if (!planAndInterval) {
    // Unknown price id. Could be a price added in Stripe that we haven't
    // mapped yet; log and skip rather than corrupting the user's plan.
    // eslint-disable-next-line no-console
    console.error("Unknown price id on subscription", {
      subscriptionId: subscription.id,
      priceId: subscription.items.data[0]?.price.id,
    });
    return;
  }

  const status: SubscriptionStatus = mapStripeSubscriptionStatus(subscription.status);
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const admin = createAdminClient();
  await admin
    .from("users")
    .update({
      stripe_subscription_id: subscription.id,
      subscription_plan: planAndInterval.plan,
      subscription_status: status,
      subscription_interval: planAndInterval.interval,
      subscription_current_period_end: periodEnd,
    })
    .eq("stripe_customer_id", customerId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const admin = createAdminClient();
  await admin
    .from("users")
    .update({
      stripe_subscription_id: null,
      subscription_plan: "free",
      subscription_status: "cancelled",
      subscription_interval: null,
      subscription_current_period_end: null,
    })
    .eq("stripe_customer_id", customerId);
}

function getConfiguredPrices() {
  return {
    proMonthly: env.stripePriceProMonthly(),
    proAnnual: env.stripePriceProAnnual(),
    businessMonthly: env.stripePriceBusinessMonthly(),
    businessAnnual: env.stripePriceBusinessAnnual(),
  };
}
