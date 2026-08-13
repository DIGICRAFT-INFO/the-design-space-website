"use client";

import FadeIn from "@/components/website/FadeIn";
import SplitText from "@/components/website/SplitText";
import AboutImageSlider from "@/components/website/about/AboutImageSlider";
import type { WebAbout } from "@/services/websiteService";

type Props = { data: WebAbout["who_we_are"] };

export default function WhoWeAreSection({ data }: Props) {
  const images = data.slider_images ?? [];

  return (
    <section
      className="py-20 md:py-32"
      style={{ background: "var(--ds-bg)" }}
    >
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        {/* 50/50 split grid — text left, slider right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Left: Text Column ──────────────────────────────────── */}
          <div className="flex flex-col justify-center order-2 lg:order-1">
            <FadeIn>
              <p
                className="mb-4 tracking-[0.25em] uppercase text-[11px] font-semibold"
                style={{ color: "#C49A45" }}
              >
                Who We Are
              </p>
            </FadeIn>

            <SplitText
              text={data.title || "A Collective of Visionaries & Artisans"}
              as="h2"
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-light leading-[1.15] tracking-tight mb-6"
              style={{
                fontFamily: "var(--font-display)",
                color: "#1A1A1A",
              }}
            />

            <FadeIn delay={0.35}>
              <p
                className="text-base md:text-lg leading-relaxed max-w-xl"
                style={{
                  color: "#555555",
                  // Critical: kill browser hyphenation that causes "func- tionality" breaks
                  hyphens: "none",
                  WebkitHyphens: "none",
                  MozHyphens: "none",
                  msHyphens: "none",
                  wordBreak: "normal",
                  overflowWrap: "break-word",
                  textAlign: "left",
                }}
              >
                {data.body ||
                  "The Design Space is a full-service architectural and interior design studio rooted in the belief that great spaces are never accidental. We blend timeless aesthetics with purposeful functionality — creating spaces and environments that feel considered, personal, and enduring."}
              </p>
            </FadeIn>

            {/* Decorative gold rule */}
            <FadeIn delay={0.55}>
              <div
                className="mt-8 h-px w-16"
                style={{ background: "#C49A45", opacity: 0.6 }}
              />
            </FadeIn>
          </div>

          {/* ── Right: Image Slider ─────────────────────────────────── */}
          <FadeIn
            delay={0.2}
            className="order-1 lg:order-2 w-full"
          >
            <AboutImageSlider
              images={images}
              fallbackImage={data.background_image || undefined}
              interval={5000}
            />
          </FadeIn>

        </div>
      </div>
    </section>
  );
}
