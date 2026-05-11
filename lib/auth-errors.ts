// Translate Supabase auth error codes/messages into something a user can read.
// Supabase returns the raw text via `error.message`; this normalises the few
// we care about for M1.

import type { AuthError } from "@supabase/supabase-js";

export function friendlyAuthError(error: AuthError | { message: string } | null): string {
  if (!error) return "Something went wrong. Please try again.";
  const msg = error.message?.toLowerCase() ?? "";

  if (msg.includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }
  if (msg.includes("email not confirmed")) {
    return "Please confirm your email address before logging in.";
  }
  if (msg.includes("user already registered")) {
    return "An account with that email already exists. Try logging in instead.";
  }
  if (msg.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return error.message || "Something went wrong. Please try again.";
}
