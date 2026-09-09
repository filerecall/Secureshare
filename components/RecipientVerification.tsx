"use client";

import { useState, type FormEvent } from "react";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FormMessage } from "@/components/ui/FormMessage";

interface Props {
  token: string;
  /** Masked hint, e.g. "b••@example.com". Never the full address. */
  recipientHint: string;
}

type Stage = "email" | "code";

/**
 * The gate a recipient-verified link shows before the document.
 *
 * Two steps: prove you know the address the link was sent to, then prove you
 * can read that mailbox. The document itself is never fetched until the
 * server has set the verification cookie.
 */
export function RecipientVerification({ token, recipientHint }: Props) {
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function requestCode(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/d/${token}/verify/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Could not send a code.");

      setStage("code");
      setNotice(
        "If that address is the one this document was sent to, a 6-digit code is on its way. It expires in 10 minutes.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/d/${token}/verify/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "That code isn't right.");

      // The cookie is set; reload so the server renders the viewer. A full
      // reload (not a router refresh) guarantees the new cookie is used.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code isn't right.");
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          {stage === "email" ? (
            <ShieldCheck className="h-5 w-5" aria-hidden />
          ) : (
            <MailCheck className="h-5 w-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-900">
            {stage === "email" ? "Verify it's you" : "Enter your code"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {stage === "email"
              ? `This document is locked to one email address (${recipientHint}). Confirm the address to get a one-time code.`
              : `We've emailed a 6-digit code to ${recipientHint}.`}
          </p>
        </div>
      </div>

      {error ? <FormMessage>{error}</FormMessage> : null}
      {notice ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {notice}
        </p>
      ) : null}

      {stage === "email" ? (
        <form onSubmit={requestCode} className="space-y-4" noValidate>
          <Input
            label="Your email address"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <Button type="submit" loading={busy} fullWidth>
            Send me a code
          </Button>
        </form>
      ) : (
        <form onSubmit={confirmCode} className="space-y-4" noValidate>
          <Input
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
          />
          <Button type="submit" loading={busy} fullWidth>
            Open document
          </Button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void requestCode()}
            className="flex w-full items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
            Didn&apos;t get it? Send another code
          </button>
        </form>
      )}

      <p className="border-t border-slate-200 pt-4 text-xs text-slate-500">
        Codes go only to the address this document was sent to, so a forwarded link won&apos;t
        open for anyone else.
      </p>
    </Card>
  );
}
