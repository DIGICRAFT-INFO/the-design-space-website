"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { resolveMediaUrl } from "@/lib/media";
import FadeIn from "@/components/website/FadeIn";
import type { ProcessStep } from "@/services/websiteService";

const DEFAULT_STEPS: Partial<ProcessStep>[] = [
  { stage: "01", title: "Consultation", body: "We listen first — understanding how you live, work, and want to feel in the space." },
  { stage: "02", title: "Spatial Planning", body: "Layouts, material palettes, and lighting plans are drafted around that brief." },
  { stage: "03", title: "Execution", body: "Our site teams and craftsmen bring the plan to life, with weekly progress reviews." },
];

export default function ProcessSection({ miniTitle, steps }: { miniTitle: string; steps: ProcessStep[] }) {
  const items = steps.length ? steps : (DEFAULT_STEPS as ProcessStep[]);
  const [active, setActive] = useState(0);

  return (
    <section className="bg-[var(--ds-bg-alt)] border-y border-[var(--ds-border)]">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-24 md:py-36">
        <FadeIn>
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-12">{miniTitle}</p>
        </FadeIn>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-20">
          {/* Left — sticky list (desktop) */}
          <div className="lg:w-1/2 lg:sticky lg:top-28 self-start space-y-1">
            {items.map((step, i) => (
              <button
                key={step.id || i}
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                className={`block w-full text-left py-6 border-b border-[var(--ds-border)] transition-colors ${
                  active === i ? "text-[var(--ds-ink)]" : "text-[var(--ds-ink-soft)]"
                }`}
              >
                <span className="text-[12px] tracking-[0.14em] text-[var(--ds-gold)]">{step.stage}</span>
                <h3 className="text-2xl md:text-3xl font-light mt-2" style={{ fontFamily: "var(--font-display)" }}>
                  {step.title}
                </h3>
                {active === i && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.4 }}
                    className="text-sm text-[var(--ds-ink-soft)] mt-3 max-w-md leading-relaxed lg:hidden"
                  >
                    {step.body}
                  </motion.p>
                )}
              </button>
            ))}
          </div>

          {/* Right — media slot (desktop only) */}
          <div className="hidden lg:block lg:w-1/2">
            <div className="sticky top-28 aspect-[4/5] rounded-sm overflow-hidden bg-[var(--ds-bg)] relative">
              {items.map((step, i) => (
                <motion.img
                  key={step.id || i}
                  src={resolveMediaUrl(step.associated_image) || "/logo.png"}
                  alt={step.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={false}
                  animate={{ opacity: active === i ? 1 : 0 }}
                  transition={{ duration: 0.5 }}
                />
              ))}
              <div className="absolute inset-0 bg-black/25" />
              <div className="absolute inset-0 flex items-end p-8 pointer-events-none">
                <p className="text-white/90 text-sm max-w-sm leading-relaxed drop-shadow">{items[active]?.body}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
