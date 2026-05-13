"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormMessage } from "@/components/ui/FormMessage";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { env } from "@/lib/env";

interface Props {
  currentEmail: string;
}

export function AccountSettingsForm({ currentEmail }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <UpdateEmailForm currentEmail={currentEmail} />
      <UpdatePasswordForm />
    </div>
  );
}

function UpdateEmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || email === currentEmail) {
      setError("Enter a different email to update.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    // Supabase sends a confirmation link to the new address. The change only
    // applies after the user clicks that link.
    const { error: authError } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${env.siteUrl()}/dashboard/settings` },
    );

    if (authError) {
      setError(friendlyAuthError(authError));
      setLoading(false);
      return;
    }
    setInfo(`We sent a confirmation link to ${email}. Click it to finish the change.`);
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <div>
        <p className="text-sm font-semibold text-slate-900">Email</p>
        <p className="text-xs text-slate-500">
          Used for sign-in and important notifications.
        </p>
      </div>
      {error ? <FormMessage>{error}</FormMessage> : null}
      {info ? <FormMessage tone="success">{info}</FormMessage> : null}
      <Input
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <div>
        <Button type="submit" loading={loading} disabled={email === currentEmail}>
          Update email
        </Button>
      </div>
    </form>
  );
}

function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      setError(friendlyAuthError(authError));
      setLoading(false);
      return;
    }
    setInfo("Password updated.");
    setPassword("");
    setConfirm("");
    setLoading(false);
    // The Supabase session still works, but refresh the server components
    // so any session-related UI updates.
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-slate-200 pt-6" noValidate>
      <div>
        <p className="text-sm font-semibold text-slate-900">Password</p>
        <p className="text-xs text-slate-500">Use 8+ characters with a mix of letters and numbers.</p>
      </div>
      {error ? <FormMessage>{error}</FormMessage> : null}
      {info ? <FormMessage tone="success">{info}</FormMessage> : null}
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <div>
        <Button type="submit" loading={loading}>
          Update password
        </Button>
      </div>
    </form>
  );
}
