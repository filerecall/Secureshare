import { Clock, Eye, KeyRound, LineChart, MailCheck, ShieldOff } from "lucide-react";

interface Feature {
  icon: typeof KeyRound;
  title: string;
  body: string;
  why: string;
}

const features: Feature[] = [
  {
    icon: KeyRound,
    title: "Tokenised links",
    body: "Every share is a cryptographically random 32-byte token, never an enumerable ID.",
    why: "An attacker can't guess their way to your documents.",
  },
  {
    icon: Clock,
    title: "Flexible expiry",
    body: "Expire by date, by first view, or revoke manually. Set the policy that matches the document.",
    why: "Sensitive files stop being your problem the moment they should.",
  },
  {
    icon: Eye,
    title: "View tracking",
    body: "See every open, with timestamp, IP, and device. Catch forwarding the moment it happens.",
    why: "If a deal goes sideways, you'll know who opened what, and when.",
  },
  {
    icon: ShieldOff,
    title: "One-click revoke",
    body: "Change your mind? Kill access instantly. Recipients get a clean 'link expired' page.",
    why: "A mistaken send is a 10-second fix, not a legal incident.",
  },
  {
    icon: MailCheck,
    title: "Recipient verification",
    body: "Tie a link to a specific email so only the intended reader can open it.",
    why: "Forwarded links don't work for anyone who isn't supposed to see the file.",
  },
  {
    icon: LineChart,
    title: "Full audit log",
    body: "Every view, download, and block, captured for compliance and peace of mind.",
    why: "Audit-ready evidence whenever Legal or InfoSec asks.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">Features</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to share with confidence.
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Built for teams that handle contracts, financials, and anything that shouldn&apos;t live
            in someone&apos;s inbox.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body, why }) => (
            <div
              key={title}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-sm shadow-brand/30">
                <Icon className="h-7 w-7" aria-hidden />
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              <p className="mt-4 border-t border-slate-100 pt-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                Why it matters
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{why}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
