"use client";

import { motion } from "framer-motion";
import RevealImage from "@/components/website/RevealImage";
import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";
import MagneticButton from "@/components/website/MagneticButton";
import { resolveMediaUrl } from "@/lib/media";
import type { TeamMember } from "@/services/websiteService";

type Props = { founder: TeamMember };

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function InstagramIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export default function FounderCard({ founder }: Props) {
  return (
    <section className="py-24 md:py-36 bg-[var(--ds-bg-alt)] border-t border-[var(--ds-border)] overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        <FadeIn className="mb-12">
          <p className="text-[12px] tracking-[0.3em] uppercase text-[var(--ds-gold)]">
            Founder
          </p>
        </FadeIn>

        {/* Asymmetric grid: larger image col + text col */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20 items-center">
          {/* Image */}
          <div className="relative">
            <motion.div
              className="absolute -inset-6 rounded-3xl bg-[var(--ds-gold)]/5 -z-10"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 1, ease: EASE }}
            />
            <RevealImage
              src={resolveMediaUrl(founder.avatar_url) || "/logo.png"}
              alt={founder.name}
              className="aspect-[4/5] rounded-2xl"
              cursorLabel="Founder"
            />
          </div>

          {/* Text */}
          <div>
            <SplitText
              text={founder.name}
              as="h2"
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            />

            <FadeIn delay={0.2}>
              <p className="text-sm md:text-base text-[var(--ds-gold)] tracking-widest uppercase mb-6">
                {founder.designation}
              </p>
            </FadeIn>

            {founder.bio && (
              <FadeIn delay={0.35}>
                <p className="text-base md:text-lg text-[var(--ds-ink-soft)] leading-relaxed mb-8">
                  {founder.bio}
                </p>
              </FadeIn>
            )}

            {/* Divider */}
            <motion.div
              className="h-px bg-[var(--ds-border)] mb-8"
              initial={{ scaleX: 0, originX: "0%" }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
            />

            {/* Social links */}
            {(founder.social_instagram || founder.social_linkedin) && (
              <FadeIn delay={0.55}>
                <div className="flex flex-wrap items-center gap-3">
                  {founder.social_instagram && (
                    <MagneticButton
                      as="a"
                      href={founder.social_instagram}
                      className="flex items-center gap-2 text-[11px] tracking-[0.12em] uppercase text-[var(--ds-ink-soft)] hover:text-[var(--ds-gold)] transition-colors border border-[var(--ds-border)] hover:border-[var(--ds-gold)] px-4 py-2.5 rounded-full"
                    >
                      <InstagramIcon />
                      Instagram
                    </MagneticButton>
                  )}
                  {founder.social_linkedin && (
                    <MagneticButton
                      as="a"
                      href={founder.social_linkedin}
                      className="flex items-center gap-2 text-[11px] tracking-[0.12em] uppercase text-[var(--ds-ink-soft)] hover:text-[var(--ds-gold)] transition-colors border border-[var(--ds-border)] hover:border-[var(--ds-gold)] px-4 py-2.5 rounded-full"
                    >
                      <LinkedInIcon />
                      LinkedIn
                    </MagneticButton>
                  )}
                </div>
              </FadeIn>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
