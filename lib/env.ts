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
};
