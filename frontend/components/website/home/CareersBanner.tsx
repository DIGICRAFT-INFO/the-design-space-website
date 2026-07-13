import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";
import MagneticButton from "@/components/website/MagneticButton";

export default function CareersBanner({
  title,
  subtitle,
  ctaLabel,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
}) {
  return (
    <section className="bg-[var(--ds-ink)] text-[var(--ds-bg)]">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-24 md:py-32 text-center">
        <p className="text-[12px] tracking-[0.3em] uppercase text-[#E6C687] mb-5">Careers</p>
        <SplitText
          text={title}
          as="h2"
          className="text-3xl md:text-5xl lg:text-6xl font-light tracking-tight mb-6 max-w-4xl mx-auto"
          style={{ fontFamily: "var(--font-display)" }}
        />
        <FadeIn delay={0.2}>
          <p className="text-base opacity-70 max-w-lg mx-auto mb-10">{subtitle}</p>
          <MagneticButton
            as="a"
            href="/careers"
            data-cursor="Careers"
            className="inline-flex items-center px-7 py-3.5 bg-[var(--ds-bg)] text-[var(--ds-ink)] rounded-full text-[11px] tracking-[0.14em] uppercase font-medium"
          >
            {ctaLabel}
          </MagneticButton>
        </FadeIn>
      </div>
    </section>
  );
}
