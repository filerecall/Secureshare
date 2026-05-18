"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormMessage } from "@/components/ui/FormMessage";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { env } from "@/lib/env";
import { normalisePlanParam, type PlanParam } from "@/lib/plan-param";

interface Props {
  /** Plan the user selected on the marketing site. Drives post-signup routing. */
  preselectedPlan?: PlanParam;
}

export function SignupForm({ preselectedPlan }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Where to send the user after they're authenticated. Free / no-plan goes
  // straight to the dashboard. Paid plans go to /pricing?plan=X which the
  // pricing page uses to kick off Stripe Checkout in one click.
  const postAuthPath =
    preselectedPlan && preselectedPlan !== "free"
      ? `/pricing?plan=${preselectedPlan}`
      : "/dashboard";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      // Preserve the plan in the post-confirmation redirect URL so the
      // pricing-page handoff still works after the email-confirmation flow.
      options: { emailRedirectTo: `${env.siteUrl()}${postAuthPath}` },
    });

    if (authError) {
      setError(friendlyAuthError(authError));
      setLoading(false);
      return;
    }

    // If Supabase requires email confirmation, no session is returned.
    if (!data.session) {
      setInfo(
        preselectedPlan && preselectedPlan !== "free"
          ? `Check your inbox to confirm your email. You'll be taken to checkout for the ${normalisePlanParam(preselectedPlan).label} plan once confirmed.`
          : "Check your inbox to confirm your email, then log in.",
      );
      setLoading(false);
      return;
    }

    router.replace(postAuthPath);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <FormMessage>{error}</FormMessage> : null}
      {info ? <FormMessage tone="success">{info}</FormMessage> : null}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 8 characters"
        hint="Use 8+ characters. Mix letters, numbers, and symbols for stronger security."
      />

      <Button type="submit" loading={loading} fullWidth>
        Create account
      </Button>
    </form>
  );
}
