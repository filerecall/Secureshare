function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Missing environment variable: ${name}. Copy .env.example to .env.local and fill in the Supabase values.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () =>
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  // Server-only. Used by the recipient flow to read share_links without an
  // authenticated user (the recipient isn't logged in). Never expose this to
  // the browser; calling it from a client component will throw at runtime
  // because the value isn't inlined.
  supabaseServiceRoleKey: () =>
    required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  siteUrl: () => {
    // 1. Explicit override wins. Set NEXT_PUBLIC_SITE_URL on Vercel for
    //    production / staging so this points at your real domain.
    const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    if (explicit) return explicit;
    // 2. On Vercel, fall back to the auto-injected deployment URL. This
    //    keeps preview deployments working without per-branch config.
    //    Vercel exposes the host without a scheme, so prepend https://.
    const vercelHost = (
      process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL
    )?.replace(/\/$/, "");
    if (vercelHost) return `https://${vercelHost}`;
    // 3. Local dev fallback.
    return "http://localhost:3000";
  },
  awsRegion: () => required("AWS_REGION", process.env.AWS_REGION),
  awsAccessKeyId: () => required("AWS_ACCESS_KEY_ID", process.env.AWS_ACCESS_KEY_ID),
  awsSecretAccessKey: () =>
    required("AWS_SECRET_ACCESS_KEY", process.env.AWS_SECRET_ACCESS_KEY),
  awsS3Bucket: () => required("AWS_S3_BUCKET", process.env.AWS_S3_BUCKET),

  // Resend (transactional email)
  resendApiKey: () => required("RESEND_API_KEY", process.env.RESEND_API_KEY),
  resendFromEmail: () =>
    process.env.RESEND_FROM_EMAIL || "SecureShare <no-reply@filerecall.com>",

  // Stripe. Secret key is server-only; publishable key is exposed to the
  // browser via NEXT_PUBLIC_ for the Stripe.js bundle.
  stripeSecretKey: () => required("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY),
  stripePublishableKey: () =>
    required("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
  stripeWebhookSecret: () =>
    required("STRIPE_WEBHOOK_SECRET", process.env.STRIPE_WEBHOOK_SECRET),
  // Stripe Price IDs - one per plan/interval. Created in Stripe Dashboard
  // and pasted into env. We deliberately resolve lazily so missing values
  // only blow up when the relevant plan is selected.
  stripePriceProMonthly: () =>
    required("STRIPE_PRICE_PRO_MONTHLY", process.env.STRIPE_PRICE_PRO_MONTHLY),
  stripePriceProAnnual: () =>
    required("STRIPE_PRICE_PRO_ANNUAL", process.env.STRIPE_PRICE_PRO_ANNUAL),
  stripePriceBusinessMonthly: () =>
    required("STRIPE_PRICE_BUSINESS_MONTHLY", process.env.STRIPE_PRICE_BUSINESS_MONTHLY),
  stripePriceBusinessAnnual: () =>
    required("STRIPE_PRICE_BUSINESS_ANNUAL", process.env.STRIPE_PRICE_BUSINESS_ANNUAL),
};
