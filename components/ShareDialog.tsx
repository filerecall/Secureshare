"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Copy, Loader2, Pencil, ShieldOff, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormMessage } from "@/components/ui/FormMessage";
import type { ExpiryType, ShareLinkRow } from "@/types/database";

interface Props {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
}

interface ShareLinkWithUrl extends ShareLinkRow {
  url: string;
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

  // Create-new form state
  const [recipientEmail, setRecipientEmail] = useState("");
  const [optionIndex, setOptionIndex] = useState(1);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Existing links + revoke state
  const [links, setLinks] = useState<ShareLinkWithUrl[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [confirmingRevokeId, setConfirmingRevokeId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit-expiry state. When editingExpiryForId is set, that row swaps its
  // status display for an inline expiry picker.
  const [editingExpiryForId, setEditingExpiryForId] = useState<string | null>(null);
  const [editingOptionIndex, setEditingOptionIndex] = useState(1);
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [editExpiryError, setEditExpiryError] = useState<string | null>(null);

  // Drive the native <dialog> open state from the prop.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  const refreshLinks = useCallback(async () => {
    setLinksError(null);
    setLinksLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/links`);
      if (!res.ok) throw new Error("Could not load links");
      const { shareLinks } = (await res.json()) as { shareLinks: ShareLinkWithUrl[] };
      setLinks(shareLinks);
    } catch (err) {
      setLinksError(err instanceof Error ? err.message : "Could not load links");
    } finally {
      setLinksLoading(false);
    }
  }, [documentId]);

  // Reset internal state + load links whenever the dialog is reopened.
  useEffect(() => {
    if (open) {
      setRecipientEmail("");
      setOptionIndex(1);
      setCreateError(null);
      setCreating(false);
      setConfirmingRevokeId(null);
      setRevokingId(null);
      setCopiedId(null);
      setEditingExpiryForId(null);
      setEditExpiryError(null);
      setSavingExpiry(false);
      void refreshLinks();
    }
  }, [open, refreshLinks]);

  function startEditingExpiry(link: ShareLinkWithUrl) {
    // Pre-select the dropdown option that matches the link's current expiry,
    // so the user can see what's set before changing it.
    const matchIndex = EXPIRY_OPTIONS.findIndex((opt) => {
      if (opt.kind === "first_view") return link.expiry_type === "first_view";
      if (opt.kind === "manual") return link.expiry_type !== "days" && link.expiry_type !== "first_view";
      return link.expiry_type === "days" && link.expiry_days === opt.days;
    });
    setEditingOptionIndex(matchIndex >= 0 ? matchIndex : 1);
    setEditingExpiryForId(link.id);
    setEditExpiryError(null);
  }

  async function saveExpiry(linkId: string) {
    setEditExpiryError(null);
    const option = EXPIRY_OPTIONS[editingOptionIndex];
    if (!option) {
      setEditExpiryError("Pick an expiry option.");
      return;
    }

    setSavingExpiry(true);
    try {
      const body: Record<string, unknown> = { expiryType: option.kind };
      if (option.kind === "days") body.expiryDays = option.days;

      const res = await fetch(`/api/share-links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to update expiry");
      }
      setEditingExpiryForId(null);
      await refreshLinks();
    } catch (err) {
      setEditExpiryError(err instanceof Error ? err.message : "Failed to update expiry");
    } finally {
      setSavingExpiry(false);
    }
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);

    const option = EXPIRY_OPTIONS[optionIndex];
    if (!option) {
      setCreateError("Pick an expiry option.");
      return;
    }

    setCreating(true);
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

      // Refresh the existing-links list so the new one shows up at the top.
      setRecipientEmail("");
      await refreshLinks();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(linkId: string) {
    setRevokingId(linkId);
    try {
      const res = await fetch(`/api/share-links/${linkId}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to revoke");
      await refreshLinks();
    } catch {
      // Surface inline next to the row in a future iteration; for now reload
      // the list to reset state on error.
      await refreshLinks();
    } finally {
      setRevokingId(null);
      setConfirmingRevokeId(null);
    }
  }

  async function copyLink(link: ShareLinkWithUrl) {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId((current) => (current === link.id ? null : current)), 2000);
    } catch {
      /* clipboard blocked; user can copy from URL bar manually */
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-2xl p-0 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[min(40rem,calc(100vh-2rem))] w-[min(32rem,calc(100vw-2rem))] flex-col bg-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Share document</h2>
            <p className="mt-1 truncate text-sm text-slate-600" title={documentName}>
              {documentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Existing links */}
          <section className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Existing links
            </h3>

            {linksLoading ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading links...
              </div>
            ) : linksError ? (
              <FormMessage>{linksError}</FormMessage>
            ) : links.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No links yet. Create one below.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
                {links.map((link) => (
                  <ShareLinkItem
                    key={link.id}
                    link={link}
                    confirming={confirmingRevokeId === link.id}
                    revoking={revokingId === link.id}
                    copied={copiedId === link.id}
                    editing={editingExpiryForId === link.id}
                    editingOptionIndex={editingOptionIndex}
                    saving={savingExpiry && editingExpiryForId === link.id}
                    editError={editingExpiryForId === link.id ? editExpiryError : null}
                    onCopy={() => copyLink(link)}
                    onRequestRevoke={() => setConfirmingRevokeId(link.id)}
                    onCancelRevoke={() => setConfirmingRevokeId(null)}
                    onConfirmRevoke={() => handleRevoke(link.id)}
                    onRequestEdit={() => startEditingExpiry(link)}
                    onCancelEdit={() => {
                      setEditingExpiryForId(null);
                      setEditExpiryError(null);
                    }}
                    onChangeEditOption={(i) => setEditingOptionIndex(i)}
                    onSaveEdit={() => saveExpiry(link.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* Create new */}
          <section className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Create new link
            </h3>

            <form onSubmit={handleCreate} className="mt-3 flex flex-col gap-4" noValidate>
              {createError ? <FormMessage>{createError}</FormMessage> : null}
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
                  You can revoke any link at any time, regardless of the expiry rule.
                </p>
              </div>
              <Button type="submit" loading={creating} fullWidth>
                Create secure link
              </Button>
            </form>
          </section>
        </div>
      </div>
    </dialog>
  );
}

interface ShareLinkItemProps {
  link: ShareLinkWithUrl;
  confirming: boolean;
  revoking: boolean;
  copied: boolean;
  editing: boolean;
  editingOptionIndex: number;
  saving: boolean;
  editError: string | null;
  onCopy: () => void;
  onRequestRevoke: () => void;
  onCancelRevoke: () => void;
  onConfirmRevoke: () => void;
  onRequestEdit: () => void;
  onCancelEdit: () => void;
  onChangeEditOption: (index: number) => void;
  onSaveEdit: () => void;
}

function ShareLinkItem({
  link,
  confirming,
  revoking,
  copied,
  editing,
  editingOptionIndex,
  saving,
  editError,
  onCopy,
  onRequestRevoke,
  onCancelRevoke,
  onConfirmRevoke,
  onRequestEdit,
  onCancelEdit,
  onChangeEditOption,
  onSaveEdit,
}: ShareLinkItemProps) {
  const status = computeStatus(link);
  const canRevoke = status === "Active";
  const canEdit = status === "Active";

  return (
    <li className="bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">
            {link.recipient_email}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{describeExpiry(link, status)}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {editing ? (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-medium text-slate-700">
            New expiry
            <select
              value={editingOptionIndex}
              onChange={(e) => onChangeEditOption(Number(e.target.value))}
              disabled={saving}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {EXPIRY_OPTIONS.map((opt, i) => (
                <option key={i} value={i}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {editError ? <p className="text-xs text-red-600">{editError}</p> : null}
          <p className="text-[11px] text-slate-500">
            Days-based expiry restarts from now. Switching to first view leaves any past
            opens recorded for the audit log.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onCancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={onSaveEdit} loading={saving}>
              Save expiry
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onCopy}
            disabled={!canRevoke && status !== "Used"}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy link
              </>
            )}
          </Button>

          {canEdit ? (
            <Button size="sm" variant="ghost" onClick={onRequestEdit}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit expiry
            </Button>
          ) : null}

          {canRevoke ? (
            confirming ? (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-slate-600">Revoke this link?</span>
                <Button size="sm" variant="ghost" onClick={onCancelRevoke} disabled={revoking}>
                  Cancel
                </Button>
                <Button size="sm" variant="danger" onClick={onConfirmRevoke} loading={revoking}>
                  <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                  Yes, revoke
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={onRequestRevoke} className="ml-auto">
                <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                Revoke
              </Button>
            )
          ) : null}
        </div>
      )}
    </li>
  );
}

type LinkStatus = "Active" | "Revoked" | "Expired" | "Used";

function computeStatus(link: ShareLinkRow): LinkStatus {
  if (link.revoked_at) return "Revoked";
  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) return "Expired";
  if (link.expiry_type === "first_view" && link.first_viewed_at) return "Used";
  return "Active";
}

function StatusBadge({ status }: { status: LinkStatus }) {
  const styles: Record<LinkStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    Revoked: "bg-red-50 text-red-700 ring-red-100",
    Expired: "bg-slate-100 text-slate-600 ring-slate-200",
    Used: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function describeExpiry(link: ShareLinkRow, status: LinkStatus): string {
  if (status === "Revoked" && link.revoked_at) {
    return `Revoked ${formatRelative(link.revoked_at)}`;
  }
  if (status === "Expired" && link.expires_at) {
    return `Expired ${formatRelative(link.expires_at)}`;
  }
  if (status === "Used" && link.first_viewed_at) {
    return `Opened once on ${formatDate(link.first_viewed_at)}`;
  }
  if (link.expiry_type === "first_view") {
    return "Expires after first view";
  }
  if (link.expiry_type === "days" && link.expires_at) {
    return `Expires ${formatRelative(link.expires_at)}`;
  }
  return "No automatic expiry";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelative(iso: string): string {
  const target = new Date(iso).getTime();
  const diffSeconds = Math.round((target - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const sign = diffSeconds >= 0 ? "in " : "";
  const suffix = diffSeconds >= 0 ? "" : " ago";

  if (abs < 60) return `${sign}${abs}s${suffix}`;
  if (abs < 3600) return `${sign}${Math.round(abs / 60)}m${suffix}`;
  if (abs < 86400) return `${sign}${Math.round(abs / 3600)}h${suffix}`;
  return `${sign}${Math.round(abs / 86400)}d${suffix}`;
}
