"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import MagneticButton from "@/components/website/MagneticButton";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function NotFoundContent() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6 text-center">
      <div>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)] mb-6"
        >
          Page Not Found
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          className="text-6xl md:text-8xl font-light tracking-tight mb-6"
          style={{ fontFamily: "var(--font-display, serif)" }}
        >
          404
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
          className="text-base text-[var(--ds-ink-soft)] max-w-sm mx-auto mb-10"
        >
          This space hasn&rsquo;t been designed yet — or it&rsquo;s moved somewhere else entirely.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}>
          <MagneticButton
            as="a"
            href="/"
            data-cursor="Home"
            className="inline-flex items-center px-7 py-3.5 bg-[var(--ds-ink)] text-[var(--ds-bg)] rounded-full text-[11px] tracking-[0.14em] uppercase font-medium"
          >
            Return Home
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  );
}
