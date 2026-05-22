#!/usr/bin/env node
// One-shot setup script: creates the Pro and Business products in Stripe
// with monthly + annual AUD prices, then prints the env vars you need to
// paste into .env.local (and later into Vercel).
//
// Usage:
//   node --env-file=.env.local scripts/setup-stripe-products.mjs
//
// or the npm shortcut:
//   npm run setup:stripe
//
// Idempotent: re-running won't create duplicates. It looks up products by
// the SETUP_TAG metadata and reuses any that already exist.

import Stripe from "stripe";

// Bumped to v3: prices changed to $9 / $29 per the client's pricing design.
// Earlier v1 (AUD) and v2 ($15/$59) products are legacy - archive them in
// the Stripe dashboard for a clean slate.
const SETUP_TAG = "filerecall-setup-v3";

const PRODUCTS = [
  {
    key: "pro",
    name: "FileRecall Pro",
    description:
      "Advanced protection and tracking for professionals and growing businesses.",
    monthlyCents: 900, // $9
    annualCents: 8640, // $86.40 (20% off vs 12 x $9)
    envPrefix: "PRO",
  },
  {
    key: "business",
    name: "FileRecall Business",
    description: "Built for teams sharing sensitive files across organizations.",
    monthlyCents: 2900, // $29
    annualCents: 27840, // $278.40 (20% off vs 12 x $29)
    envPrefix: "BUSINESS",
  },
];

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  fail(
    "STRIPE_SECRET_KEY not found in env. Run with `node --env-file=.env.local scripts/setup-stripe-products.mjs` or `npm run setup:stripe`.",
  );
}
if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_live_")) {
  fail("STRIPE_SECRET_KEY does not look like a real Stripe secret key.");
}
const mode = secretKey.startsWith("sk_test_") ? "TEST" : "LIVE";

const stripe = new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });

async function findOrCreateProduct(spec) {
  // Search by metadata tag so re-runs reuse the same product.
  const existing = await stripe.products.search({
    query: `metadata['setup_tag']:'${SETUP_TAG}' AND metadata['plan_key']:'${spec.key}'`,
    limit: 1,
  });
  if (existing.data.length > 0) {
    console.log(`  ↺  Reusing existing product: ${spec.name} (${existing.data[0].id})`);
    return existing.data[0];
  }
  const product = await stripe.products.create({
    name: spec.name,
    description: spec.description,
    metadata: { setup_tag: SETUP_TAG, plan_key: spec.key },
  });
  console.log(`  +  Created product: ${spec.name} (${product.id})`);
  return product;
}

async function findOrCreatePrice(product, interval, unitAmountCents) {
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });
  const match = prices.data.find(
    (p) =>
      p.currency === "usd" &&
      p.unit_amount === unitAmountCents &&
      p.recurring?.interval === interval,
  );
  if (match) {
    console.log(`    ↺  Reusing ${interval} price: ${match.id}`);
    return match;
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: unitAmountCents,
    recurring: { interval },
    metadata: { setup_tag: SETUP_TAG },
  });
  console.log(`    +  Created ${interval} price: ${price.id}`);
  return price;
}

async function main() {
  console.log(`\nStripe ${mode} mode\n`);

  const envLines = [];
  for (const spec of PRODUCTS) {
    console.log(`${spec.name}:`);
    const product = await findOrCreateProduct(spec);
    const monthly = await findOrCreatePrice(product, "month", spec.monthlyCents);
    const annual = await findOrCreatePrice(product, "year", spec.annualCents);
    envLines.push(`STRIPE_PRICE_${spec.envPrefix}_MONTHLY=${monthly.id}`);
    envLines.push(`STRIPE_PRICE_${spec.envPrefix}_ANNUAL=${annual.id}`);
    console.log("");
  }

  console.log("✓ Done.\n");
  console.log("Paste these into .env.local (and Vercel env vars for production):\n");
  for (const line of envLines) console.log(line);
  console.log("");
  console.log(
    `Next: create a webhook endpoint at ${mode === "LIVE" ? "https://dashboard.stripe.com" : "https://dashboard.stripe.com/test"}/webhooks pointing at`,
  );
  console.log("  https://<your-vercel-url>/api/webhooks/stripe");
  console.log("");
  console.log("Events to send:");
  console.log("  - checkout.session.completed");
  console.log("  - customer.subscription.created");
  console.log("  - customer.subscription.updated");
  console.log("  - customer.subscription.deleted");
  console.log("");
  console.log("Then put the signing secret (whsec_...) into STRIPE_WEBHOOK_SECRET.");
  console.log("");
}

main().catch((err) => {
  console.error("\n✗ Setup failed:");
  console.error(err);
  process.exit(1);
});
