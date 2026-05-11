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
  siteUrl: () =>
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000",
  awsRegion: () => required("AWS_REGION", process.env.AWS_REGION),
  awsAccessKeyId: () => required("AWS_ACCESS_KEY_ID", process.env.AWS_ACCESS_KEY_ID),
  awsSecretAccessKey: () =>
    required("AWS_SECRET_ACCESS_KEY", process.env.AWS_SECRET_ACCESS_KEY),
  awsS3Bucket: () => required("AWS_S3_BUCKET", process.env.AWS_S3_BUCKET),
};
