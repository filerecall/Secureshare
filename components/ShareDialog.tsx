"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Copy, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormMessage } from "@/components/ui/FormMessage";
import type { ExpiryType } from "@/types/database";

interface Props {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
}

type ExpiryOption =
  | { kind: "days"; days: number; label: string }
  | { kind: "first_view"; label: string }
  | { kind: "manual"; label: string };

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { kind: "days", days: 1, label: "1 day" },
  { kind: "days", days: 7, label: "7 days" },
  { kind: "days", days: 30, label: "30 days" },
  { kind: "first_view", label: "Until first view" },
  { kind: "manual", label: "No automatic expiry" },
];

export function ShareDialog({ open, onClose, documentId, documentName }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [optionIndex, setOptionIndex] = useState(1); // default 7 days
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Drive the native <dialog> open state from the prop.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  // Reset internal state whenever the dialog is reopened.
  useEffect(() => {
    if (open) {
      setRecipientEmail("");
      setOptionIndex(1);
      setError(null);
      setCreatedUrl(null);
      setCopied(false);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const option = EXPIRY_OPTIONS[optionIndex];
    if (!option) {
      setError("Pick an expiry option.");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        recipientEmail,
        expiryType: option.kind satisfies ExpiryType,
      };
      if (option.kind === "days") body.expiryDays = option.days;

      const res = await fetch(`/api/documents/${documentId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Could not create the link.");
      }

      const { url } = (await res.json()) as { url: string };
      setCreatedUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input on next tick so the user can copy manually.
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // Native dialog backdrop styles + a centred card.
      className="rounded-2xl p-0 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm"
    >
      <div className="w-[min(28rem,calc(100vw-2rem))] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Share document</h2>
            <p className="mt-1 truncate text-sm text-slate-600" title={documentName}>
              {documentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {createdUrl ? (
          <div className="mt-6 space-y-4">
            <FormMessage tone="success">
              Your secure link is ready. Send it to the recipient via your usual channel.
            </FormMessage>
            <div className="flex items-stretch gap-2">
              <div className="flex flex-1 items-center gap-2 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{createdUrl}</span>
              </div>
              <Button type="button" variant="secondary" onClick={copyLink}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <Button type="button" variant="ghost" fullWidth onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            {error ? <FormMessage>{error}</FormMessage> : null}
            <Input
              label="Recipient email"
              type="email"
              autoComplete="off"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="recipient@example.com"
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expiry" className="text-sm font-medium text-slate-700">
                Expiry
              </label>
              <select
                id="expiry"
                value={optionIndex}
                onChange={(e) => setOptionIndex(Number(e.target.value))}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {EXPIRY_OPTIONS.map((opt, i) => (
                  <option key={i} value={i}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                You can revoke the link at any time, regardless of the expiry rule.
              </p>
            </div>
            <Button type="submit" loading={loading} fullWidth>
              Create secure link
            </Button>
          </form>
        )}
      </div>
    </dialog>
  );
}
