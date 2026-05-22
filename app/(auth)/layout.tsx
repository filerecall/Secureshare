import Link from "next/link";
import { Eye, Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

// Value-prop bullets shown on the brand panel.
const HIGHLIGHTS = [
  {
    icon: Lock,
    title: "Encrypted end to end",
    body: "AES-256 at rest, TLS 1.3 in transit. Your files are protected the moment they land.",
  },
  {
    icon: ShieldCheck,
    title: "Revoke access anytime",
    body: "Change your mind after sending? Kill the link in one click.",
  },
  {
    icon: Eye,
    title: "Know who opened what",
    body: "Every view and download is logged with a full audit trail.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Left - the form column */}
      <div className="flex w-full flex-col bg-slate-50 lg:w-1/2">
        <header className="px-6 py-6 sm:px-10">
          <Link href="/" className="inline-block">
            <Logo />
          </Link>
        </header>
        <main className="flex flex-1 items-start justify-center px-6 pb-16 sm:items-center sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>

      {/* Right - brand panel. Hidden on mobile so the form gets full width. */}
      <aside className="relative hidden w-1/2 overflow-hidden bg-brand-gradient lg:flex lg:flex-col lg:justify-center">
        {/* Soft light wash for depth */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,rgba(255,255,255,0.22),transparent_70%)]"
        />
        {/* Decorative grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px]"
        />

        <div className="relative mx-auto max-w-md px-12">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Share sensitive documents without losing control.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            FileRecall wraps every file in a tokenised, expirable, revocable link - so a
            document leaving your hands never means losing track of it.
          </p>

          <ul className="mt-10 flex flex-col gap-6">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-inset ring-white/20">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-white/75">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
