import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses Row Level Security and is intended
 * only for flows that do not have an authenticated user, e.g. the recipient
 * view at /d/[token] (the recipient is not logged in).
 *
 * Never import this from a client component, route file, or anything that
 * could end up in the browser bundle. The `server-only` import above causes
 * a build error if it does.
 */
let cached: ReturnType<typeof createClient> | null = null;

export function createAdminClient() {
  if (cached) return cached;
  cached = createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cached;
}
