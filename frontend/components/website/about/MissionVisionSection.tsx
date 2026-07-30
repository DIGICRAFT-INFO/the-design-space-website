"use client";

import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";

type Props = {
  data: { title: string; body: string };
  variant: "mission" | "vision";
};

const config = {
  mission: {
    eyebrow: "Our Mission",
    accent: "bg-[var(--ds-bg-alt)]",
    titleSize: "text-4xl sm:text-5xl md:text-6xl",
    layout: "text-left",
  },
  vision: {
    eyebrow: "Our Vision",
    accent: "bg-[var(--ds-bg)]",
    titleSize: "text-4xl sm:text-5xl md:text-6xl",
    layout: "text-left md:text-right",
  },
};

export default function MissionVisionSection({ data, variant }: Props) {
  const cfg = config[variant];

  return (
    <section className={`${cfg.accent} border-y border-[var(--ds-border)] py-24 md:py-36`}>
      <div className={`max-w-[1600px] mx-auto px-6 md:px-10 ${cfg.layout}`}>
        <FadeIn>
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-5">
            {cfg.eyebrow}
          </p>
        </FadeIn>

        <div className={variant === "vision" ? "md:ml-auto max-w-3xl" : "max-w-3xl"}>
          <SplitText
            text={data.title}
            as="h2"
            className={`${cfg.titleSize} font-light tracking-tight`}
            style={{ fontFamily: "var(--font-display)" }}
          />
          <FadeIn delay={0.35} className="mt-7">
            <p className="text-base md:text-lg text-[var(--ds-ink-soft)] leading-relaxed">
              {data.body}
            </p>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
