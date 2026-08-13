"use client";

import { motion } from "framer-motion";
import FadeIn from "@/components/website/FadeIn";
import SplitText from "@/components/website/SplitText";
import type { ValueItem } from "@/services/websiteService";

type Props = { values: ValueItem[] };

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function ValueCard({ item, index }: { item: ValueItem; index: number }) {
  return (
    <FadeIn delay={index * 0.07}>
      <motion.div
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="group p-7 md:p-8 rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-bg)] hover:border-[var(--ds-gold)] hover:shadow-[0_8px_40px_rgba(200,146,42,0.10)] transition-all duration-500"
      >
        {item.icon && (
          <span className="block text-3xl md:text-4xl mb-5 group-hover:scale-110 transition-transform duration-300 inline-block">
            {item.icon}
          </span>
        )}
        <h3
          className="text-xl md:text-2xl font-light mb-3 group-hover:text-[var(--ds-gold)] transition-colors duration-300"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {item.title}
        </h3>
        <p className="text-sm text-[var(--ds-ink-soft)] leading-relaxed">{item.description}</p>

        {/* Gold accent line on hover */}
        <motion.div
          className="mt-6 h-px bg-[var(--ds-gold)] origin-left"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
        />
      </motion.div>
    </FadeIn>
  );
}

export default function ValuesSection({ values }: Props) {
  if (!values || values.length === 0) return null;

  return (
    <section className="py-28 md:py-40 bg-[var(--ds-bg-alt)]">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="mb-16 md:mb-20">
          <FadeIn>
            <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-5">
              Our Foundation
            </p>
          </FadeIn>
          <SplitText
            text="What We Stand For"
            as="h2"
            className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight max-w-xl"
            style={{ fontFamily: "var(--font-display)" }}
          />
        </div>

        {/* Values grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
          {values.map((item, i) => (
            <ValueCard key={item.id} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
