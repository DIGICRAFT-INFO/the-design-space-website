"use client";

import FadeIn from "@/components/website/FadeIn";
import SplitText from "@/components/website/SplitText";
import AboutImageSlider from "@/components/website/about/AboutImageSlider";

type SliderImage = {
  id: string;
  image_url: string;
  alt_text: string;
  sort_order: number;
};

type Props = {
  data: { title: string; body: string; slider_images?: SliderImage[] };
  variant: "mission" | "vision";
};

export default function MissionVisionSection({ data, variant }: Props) {
  const isMission = variant === "mission";
  const images = data.slider_images ?? [];

  const eyebrow = isMission ? "Our Mission" : "Our Vision";
  const bgColor = isMission ? "var(--ds-bg)" : "var(--ds-bg-alt)";

  // Mission:  [Text | Image]   — textFirst = true
  // Vision:   [Image | Text]   — textFirst = false  (zigzag)
  const textFirst = isMission;

  const TextBlock = (
    <div className="flex flex-col justify-center">
      <FadeIn>
        <p
          className="mb-4 tracking-[0.25em] uppercase text-[11px] font-semibold"
          style={{ color: "#C49A45" }}
        >
          {eyebrow}
        </p>
      </FadeIn>

      <SplitText
        text={data.title}
        as="h2"
        className="text-3xl sm:text-4xl md:text-5xl lg:text-[3rem] font-light leading-[1.15] tracking-tight mb-6 text-[var(--ds-ink)]"
        style={{
          fontFamily: "var(--font-display)",
        }}
      />

      <FadeIn delay={0.35}>
        <p
          className="text-base md:text-lg leading-relaxed max-w-xl text-[var(--ds-ink-soft)]"
          style={{
            // ── Hyphenation fix: removes broken "func- tionality" style splits ──
            hyphens: "none",
            WebkitHyphens: "none",
            MozHyphens: "none",
            msHyphens: "none",
            wordBreak: "normal",
            overflowWrap: "break-word",
          }}
        >
          {data.body}
        </p>
      </FadeIn>

      <FadeIn delay={0.55}>
        <div
          className="mt-8 h-px w-16"
          style={{ background: "#C49A45", opacity: 0.6 }}
        />
      </FadeIn>
    </div>
  );

  const SliderBlock = (
    <FadeIn delay={0.2} className="w-full">
      <AboutImageSlider images={images} interval={5000} />
    </FadeIn>
  );

  return (
    <section className="py-20 md:py-32" style={{ background: bgColor }}>
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        {/* ── Desktop: zigzag via conditional column order ─────────── */}
        {/* On mobile both blocks stack naturally (text on top) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {textFirst ? (
            <>
              {/* Mission: text left, image right */}
              <div>{TextBlock}</div>
              <div>{SliderBlock}</div>
            </>
          ) : (
            <>
              {/* Vision: image left, text right — but on mobile text shows first */}
              <div className="order-2 lg:order-1">{SliderBlock}</div>
              <div className="order-1 lg:order-2">{TextBlock}</div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
