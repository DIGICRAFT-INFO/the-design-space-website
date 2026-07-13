import RevealImage from "@/components/website/RevealImage";
import FadeIn from "@/components/website/FadeIn";
import MagneticButton from "@/components/website/MagneticButton";
import { resolveMediaUrl } from "@/lib/media";

export default function AboutPreview({
  title,
  body,
  ctaLabel,
  image,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  image?: string;
}) {
  return (
    <section className="max-w-[1600px] mx-auto px-6 md:px-10 py-24 md:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
        <RevealImage
          src={resolveMediaUrl(image) || "/logo.png"}
          alt="The Design Space studio"
          className="aspect-[4/5] rounded-sm order-2 lg:order-1"
          cursorLabel="Our Studio"
        />
        <FadeIn className="order-1 lg:order-2">
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-4">Studio</p>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-6" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </h2>
          <p className="text-base text-[var(--ds-ink-soft)] leading-relaxed max-w-md mb-8">{body}</p>
          <MagneticButton
            as="a"
            href="/about"
            data-cursor="About"
            className="inline-flex items-center px-6 py-3 border border-[var(--ds-ink)] rounded-full text-[11px] tracking-[0.14em] uppercase font-medium hover:bg-[var(--ds-ink)] hover:text-[var(--ds-bg)] transition-colors"
          >
            {ctaLabel}
          </MagneticButton>
        </FadeIn>
      </div>
    </section>
  );
}
