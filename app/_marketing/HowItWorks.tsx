import { Lock, Send, ShieldOff, Upload } from "lucide-react";

interface Step {
  n: string;
  icon: typeof Upload;
  title: string;
  body: string;
  reassurance?: string;
}

const steps: Step[] = [
  {
    n: "01",
    icon: Upload,
    title: "Upload your document",
    body: "Drop a PDF, contract, or any sensitive file. It's encrypted at rest the moment it lands.",
    reassurance: "Files are never stored unencrypted at any point.",
  },
  {
    n: "02",
    icon: Send,
    title: "Send a secure link",
    body: "Pick a recipient, set an expiry by date, view count, or manual, and share the tokenised URL.",
  },
  {
    n: "03",
    icon: ShieldOff,
    title: "Revoke whenever you want",
    body: "See exactly who opened it, when, and from where. Kill access with one click, even after sending.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            From upload to revoke in under a minute.
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Three steps, no plug-ins, no recipient accounts required.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map(({ n, icon: Icon, title, body, reassurance }) => (
            <li
              key={n}
              className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-400">{n}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              {reassurance ? (
                <p className="mt-4 inline-flex items-start gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-100">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{reassurance}</span>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
