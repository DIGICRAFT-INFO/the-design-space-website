"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";
import { resolveMediaUrl } from "@/lib/media";
import type { WebAbout } from "@/services/websiteService";

type Props = { data: WebAbout["who_we_are"] };

export default function WhoWeAreSection({ data }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);

  return (
    <section ref={ref} className="relative overflow-hidden py-28 md:py-40">
      {/* Parallax background */}
      {data.background_image && (
        <motion.div style={{ y }} className="absolute inset-0 -z-10 scale-[1.3]">
          <img
            src={resolveMediaUrl(data.background_image)}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[var(--ds-bg)]/85" />
        </motion.div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        <FadeIn>
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-5">
            Who We Are
          </p>
        </FadeIn>
        <SplitText
          text={data.title}
          as="h2"
          className="text-4xl sm:text-5xl md:text-7xl font-light tracking-tight max-w-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        />
        <FadeIn delay={0.4} className="mt-8 max-w-2xl">
          <p className="text-base md:text-lg text-[var(--ds-ink-soft)] leading-relaxed">
            {data.body}
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
