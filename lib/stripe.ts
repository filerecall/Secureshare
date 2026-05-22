import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  cached = new Stripe(env.stripeSecretKey(), {
    // Pin the API version so a Stripe-side default change doesn't break us
    // silently. Bump deliberately when we test against a newer version.
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
  return cached;
}

/**
 * Map a Stripe subscription status to our internal status enum. Stripe has
 * more granular states (trialing, incomplete, unpaid, etc.) but for the MVP
 * we collapse them into four buckets so the rest of the app doesn't have to
 * know Stripe vocabulary.
 */
export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): "active" | "past_due" | "cancelled" {
  switch (status) {
    // Paid and usable.
    case "active":
    case "trialing":
      return "active";
    // 'past_due' is an ALREADY-ACTIVE subscription whose renewal payment
    // failed. A short grace period is appropriate, so this keeps plan access.
    case "past_due":
      return "past_due";
    // Everything below means the subscription is NOT usable:
    //  - incomplete / incomplete_expired: the FIRST payment never succeeded,
    //    so the subscription was never really active. Must NOT grant access.
    //  - unpaid: all renewal retries exhausted.
    //  - canceled / paused: self-explanatory.
    // Mapping these to 'cancelled' means activePlanFor() drops the user to
    // the free tier - a failed payment can never look like an upgrade.
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "canceled":
    case "paused":
    default:
      return "cancelled";
  }
}

/**
 * Identify which plan and interval a subscription represents by checking
 * its first item's price id against our configured price ids.
 */
export function identifyPlanFromSubscription(
  subscription: Stripe.Subscription,
  configuredPrices: {
    proMonthly: string;
    proAnnual: string;
    businessMonthly: string;
    businessAnnual: string;
  },
): { plan: "pro" | "business"; interval: "monthly" | "annual" } | null {
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return null;
  if (priceId === configuredPrices.proMonthly) return { plan: "pro", interval: "monthly" };
  if (priceId === configuredPrices.proAnnual) return { plan: "pro", interval: "annual" };
  if (priceId === configuredPrices.businessMonthly) {
    return { plan: "business", interval: "monthly" };
  }
  if (priceId === configuredPrices.businessAnnual) {
    return { plan: "business", interval: "annual" };
  }
  return null;
}
