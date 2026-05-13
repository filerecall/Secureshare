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
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
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
