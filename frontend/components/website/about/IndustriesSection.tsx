"use client";

import { motion } from "framer-motion";
import FadeIn from "@/components/website/FadeIn";
import SplitText from "@/components/website/SplitText";
import { resolveMediaUrl } from "@/lib/media";
import type { IndustryItem } from "@/services/websiteService";

type Props = { industries: IndustryItem[] };

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function IndustriesSection({ industries }: Props) {
  return (
    <section className="py-28 md:py-40 bg-[var(--ds-bg)]">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="mb-16 md:mb-20">
          <FadeIn>
            <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-5">
              Industries
            </p>
          </FadeIn>
          <SplitText
            text="Spaces We Specialise In"
            as="h2"
            className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight max-w-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          />
        </div>

        {industries.length === 0 ? (
          <FadeIn>
            <p className="text-[var(--ds-ink-soft)] text-sm">
              Industry information coming soon.
            </p>
          </FadeIn>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {industries.map((item, i) => (
              <FadeIn key={item.id} delay={i * 0.07}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="group relative overflow-hidden rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-bg-alt)]"
                >
                  {/* Image */}
                  {item.icon_url ? (
                    <div className="aspect-[16/9] overflow-hidden">
                      <motion.img
                        src={resolveMediaUrl(item.icon_url)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.6, ease: EASE }}
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-[var(--ds-bg)] flex items-center justify-center">
                      <span className="text-5xl opacity-20">🏛</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    <h3
                      className="text-xl font-light mb-2 group-hover:text-[var(--ds-gold)] transition-colors"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-[var(--ds-ink-soft)] leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Bottom gold bar on hover */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ds-gold)] origin-left"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  />
                </motion.div>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
