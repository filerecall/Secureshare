import { Quote } from "lucide-react";

// Placeholder testimonial. Replace with a real customer quote, full name,
// role, and company before going to production marketing.
const TESTIMONIAL = {
  quote:
    "We used to email NDAs as PDF attachments and hope. SecureShare gives us a paper trail, an expiry, and a kill switch. It's the first tool I onboard every new hire onto.",
  name: "Maya Patel",
  role: "Head of Legal Operations",
  company: "Northwind Capital",
};

export function Testimonial() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
        <figure className="relative">
          <Quote
            className="absolute -top-2 -left-2 h-12 w-12 -translate-y-1/2 text-slate-200"
            aria-hidden
          />
          <blockquote className="relative text-2xl font-medium leading-relaxed tracking-tight text-slate-900 sm:text-3xl">
            &ldquo;{TESTIMONIAL.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-8 flex items-center gap-4">
            <span
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-400 text-base font-semibold text-white"
            >
              {TESTIMONIAL.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{TESTIMONIAL.name}</p>
              <p className="text-sm text-slate-600">
                {TESTIMONIAL.role}, {TESTIMONIAL.company}
              </p>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
