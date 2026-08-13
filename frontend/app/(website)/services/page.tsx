import { getServices, getSeoEntries, resolveSeo } from "@/services/websiteService";
import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";
import MagneticButton from "@/components/website/MagneticButton";
import ServicesList from "@/components/website/services/ServicesList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  const seo = resolveSeo(await getSeoEntries().catch(() => []), "/services", {
    title: "Services — The Design Space",
    description: "Design packages from a single consultation to fully turnkey execution.",
  });
  return { title: seo.title, description: seo.description, keywords: seo.keywords };
}

export default async function ServicesPage() {
  const packages = await getServices().catch(() => []);

  return (
    <>
      {/* Hero */}
      <section className="page-hero-pt pb-12 md:pb-16 bg-[var(--ds-bg-alt)] border-b border-[var(--ds-border)]">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <FadeIn>
            <p className="text-[11px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-4">The Design Matrix</p>
          </FadeIn>
          <SplitText
            text="Design Packages, Built Around You"
            as="h1"
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-light tracking-tight max-w-3xl mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          />
          <FadeIn delay={0.3} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <p className="text-base md:text-lg text-[var(--ds-ink-soft)] max-w-xl leading-relaxed">
              From a single consultation to a fully turnkey execution — every engagement starts with the same
              attention to detail.
            </p>
            <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--ds-ink-soft)] shrink-0">
              {packages.length} service{packages.length !== 1 ? "s" : ""} available
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Services list */}
      <section className="py-14 md:py-20">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <ServicesList packages={packages} />
        </div>
      </section>

      {/* Consultation CTA */}
      <section className="bg-[var(--ds-ink)] text-[var(--ds-bg)]">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-14 md:py-20 text-center">
          <FadeIn>
            <p className="text-[11px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-4">Get Started</p>
          </FadeIn>
          <SplitText
            text="Book an Elite Consultation"
            as="h2"
            className="text-3xl md:text-5xl font-light tracking-tight mb-8"
            style={{ fontFamily: "var(--font-display)" }}
          />
          <FadeIn delay={0.3}>
            <MagneticButton
              as="a"
              href="/contact"
              data-cursor="Enquire"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[var(--ds-bg)] text-[var(--ds-ink)] rounded-full text-[11px] tracking-[0.14em] uppercase font-semibold hover:bg-[var(--ds-gold)] hover:text-white transition-colors"
            >
              Start the Conversation
            </MagneticButton>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
