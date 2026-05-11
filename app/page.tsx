import { Features } from "./_marketing/Features";
import { FinalCTA } from "./_marketing/FinalCTA";
import { Hero } from "./_marketing/Hero";
import { HowItWorks } from "./_marketing/HowItWorks";
import { SiteFooter } from "./_marketing/SiteFooter";
import { SiteHeader } from "./_marketing/SiteHeader";
import { Stats } from "./_marketing/Stats";
import { Testimonial } from "./_marketing/Testimonial";
import { TrustedBy } from "./_marketing/TrustedBy";
import { UseCases } from "./_marketing/UseCases";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <TrustedBy />
        <HowItWorks />
        <Stats />
        <Features />
        <UseCases />
        <Testimonial />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
