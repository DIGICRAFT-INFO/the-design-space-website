import { getOpenJobs, getSeoEntries, resolveSeo } from "@/services/websiteService";
import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";
import CareersBoard from "@/components/website/careers/CareersBoard";

export async function generateMetadata() {
  const seo = resolveSeo(await getSeoEntries().catch(() => []), "/careers", {
    title: "Careers — The Design Space",
    description: "We are hiring visionary designers. View open roles at The Design Space.",
  });
  return { title: seo.title, description: seo.description, keywords: seo.keywords };
}

export default async function CareersPage() {
  const jobs = await getOpenJobs().catch(() => []);

  return (
    <>
      <section className="pt-40 md:pt-48 pb-16 md:pb-20">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-5">Join The Studio</p>
          <SplitText
            text="We Are Hiring Visionary Designers"
            as="h1"
            className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight max-w-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          />
          <FadeIn delay={0.3}>
            <p className="text-base md:text-lg text-[var(--ds-ink-soft)] max-w-xl mt-6">
              We&rsquo;re a small studio that treats every space as a craft. If that sounds like you, we&rsquo;d love to hear from you.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="pb-28 md:pb-40">
        <div className="max-w-3xl mx-auto px-6 md:px-10">
          <CareersBoard jobs={jobs} />
        </div>
      </section>
    </>
  );
}
