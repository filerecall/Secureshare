import Image from "next/image";
import { Briefcase, Handshake, Scale, ShieldCheck, Users, Wallet } from "lucide-react";

const useCases = [
  {
    icon: Scale,
    title: "Legal teams",
    body: "Send contracts and NDAs with view-once links and recipient binding.",
  },
  {
    icon: Wallet,
    title: "Finance",
    body: "Share board decks, financials, and cap tables with auditable trails.",
  },
  {
    icon: Users,
    title: "HR",
    body: "Deliver offer letters and policy docs that expire when they should.",
  },
  {
    icon: Briefcase,
    title: "Consultants",
    body: "Hand clients deliverables that can be revoked the day the engagement ends.",
  },
  {
    icon: Handshake,
    title: "M&A and due diligence",
    body: "Share data-room documents that expire the day the deal closes, or the day it doesn't.",
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Image */}
          <div className="relative">
            <div className="absolute -inset-2 -z-10 rounded-3xl bg-gradient-to-tr from-slate-100 to-emerald-50 blur-xl" />
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
              <Image
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80"
                alt="A team collaborating on documents around a laptop"
                width={1200}
                height={900}
                className="h-full w-full object-cover"
                priority={false}
              />
            </div>
            {/* Floating stat card */}
            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xl sm:block">
              <p className="text-3xl font-semibold text-slate-900">99.9%</p>
              <p className="text-xs text-slate-500">Uptime SLA target</p>
            </div>
          </div>

          {/* Copy + cases */}
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Built for
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Teams that share what matters.
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Anywhere a document leaves your perimeter, FileRecall gives you a tokenised,
              expirable, revocable wrapper around it, without changing how your recipients work.
            </p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {useCases.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              SOC 2 alignment in progress
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
