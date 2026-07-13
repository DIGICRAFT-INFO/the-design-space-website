import { getServices, getSeoEntries, resolveSeo } from "@/services/websiteService";
import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";
import MagneticButton from "@/components/website/MagneticButton";
import ServicesList from "@/components/website/services/ServicesList";

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
      <section className="pt-40 md:pt-48 pb-16 md:pb-24">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-5">The Design Matrix</p>
          <SplitText
            text="Design Packages, Built Around You"
            as="h1"
            className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight max-w-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          />
          <FadeIn delay={0.3}>
            <p className="text-base md:text-lg text-[var(--ds-ink-soft)] max-w-xl mt-6">
              From a single consultation to a fully turnkey execution — every engagement starts with the same
              attention to detail.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="pb-28 md:pb-40">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <ServicesList packages={packages} />
        </div>
      </section>

      {/* Consultation CTA */}
      <section className="bg-[var(--ds-ink)] text-[var(--ds-bg)]">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-24 md:py-32 text-center">
          <SplitText
            text="Book an Elite Consultation Space"
            as="h2"
            className="text-3xl md:text-5xl font-light tracking-tight mb-8"
            style={{ fontFamily: "var(--font-display)" }}
          />
          <MagneticButton
            as="a"
            href="/contact"
            data-cursor="Enquire"
            className="inline-flex items-center px-7 py-3.5 bg-[var(--ds-bg)] text-[var(--ds-ink)] rounded-full text-[11px] tracking-[0.14em] uppercase font-medium"
          >
            Start the Conversation
          </MagneticButton>
        </div>
      </section>
    </>
  );
}
