import { Clock, Eye, KeyRound, LineChart, MailCheck, ShieldOff } from "lucide-react";

const features = [
  {
    icon: KeyRound,
    title: "Tokenised links",
    body: "Every share is a cryptographically random 32-byte token - never an enumerable ID.",
  },
  {
    icon: Clock,
    title: "Flexible expiry",
    body: "Expire by date, by first view, or revoke manually. Set the policy that matches the document.",
  },
  {
    icon: Eye,
    title: "View tracking",
    body: "See every open, with timestamp, IP, and device. Catch forwarding the moment it happens.",
  },
  {
    icon: ShieldOff,
    title: "One-click revoke",
    body: "Change your mind? Kill access instantly. Recipients get a clean 'link expired' page.",
  },
  {
    icon: MailCheck,
    title: "Recipient verification",
    body: "Tie a link to a specific email so only the intended reader can open it.",
  },
  {
    icon: LineChart,
    title: "Full audit log",
    body: "Every view, download, and block - captured for compliance and peace of mind.",
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
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
