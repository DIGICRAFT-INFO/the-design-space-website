"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";
import MagneticButton from "@/components/website/MagneticButton";
import type { HeroSlide } from "@/services/websiteService";

type Props = {
  slides: HeroSlide[];
  autoPlayInterval?: number;
};

export default function HeroSlider({ slides, autoPlayInterval = 5000 }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sortedSlides = [...slides].sort((a, b) => a.sort_order - b.sort_order);
  const totalSlides = sortedSlides.length;

  // ── Clear + restart the autoplay timer on every user interaction ──────
  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (totalSlides <= 1) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, autoPlayInterval);
  }

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSlides, autoPlayInterval]);

  const goToNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % totalSlides);
    resetTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    resetTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSlides]);

  const goToSlide = useCallback(
    (index: number) => {
      setDirection(index > activeIndex ? 1 : -1);
      setActiveIndex(index);
      resetTimer();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIndex]
  );

  if (totalSlides === 0) {
    return (
      <section
        className="relative flex items-end w-full bg-[var(--ds-bg-alt)]"
        style={{ height: "100svh", overflow: "hidden" }}
      >
        <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 md:px-10 pb-16 md:pb-20">
          <p className="text-white/60">No hero slides configured.</p>
        </div>
      </section>
    );
  }

  const activeSlide = sortedSlides[activeIndex];

  // ── Slide variants ────────────────────────────────────────────────────
  // Both enter and exit animate simultaneously (mode="sync") so the
  // background is ALWAYS covered — no white-gap flash.
  const bgVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
    }),
    center: {
      x: "0%",
      transition: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      transition: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
    }),
  };

  const contentVariants = {
    enter: { opacity: 0, y: 24 },
    center: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, delay: 0.35, ease: [0.4, 0, 0.2, 1] },
    },
    exit: {
      opacity: 0,
      y: -16,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
    },
  };

  return (
    /*
     * KEY FIX:
     *  - `overflow-hidden` on the outer section clips any slide that is
     *    partially translated off-screen during the transition.
     *  - Slides are `position: absolute; inset: 0` so they always fill the
     *    full viewport — even mid-transition there is zero gap.
     *  - AnimatePresence `mode="sync"` makes enter and exit run in parallel,
     *    so the incoming slide covers the white background before the outgoing
     *    slide has finished moving away.
     *  - No `max-width` or `margin` on the section itself — always 100vw.
     */
    <section
      className="relative flex items-end w-full"
      style={{
        height: "100svh",
        width: "100%",
        maxWidth: "100vw",
        overflow: "hidden",   // ← clips slides during translate; kills the gap
        position: "relative",
        backgroundColor: "var(--ds-bg-alt)", // fallback while image loads
      }}
    >
      {/* ── Background slides ─────────────────────────────────────────── */}
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={`bg-${activeSlide.id}`}
          custom={direction}
          variants={bgVariants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <img
            src={activeSlide.image_url}
            alt={activeSlide.main_title || "Hero"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
          {/* Dark overlay so text stays readable */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.32)",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Text content overlay ─────────────────────────────────────── */}
      <div
        className="relative max-w-[1600px] w-full mx-auto px-5 md:px-10 pb-20 md:pb-24 pt-20"
        style={{ zIndex: 10 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`content-${activeSlide.id}`}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <FadeIn>
              <p className="text-[12px] tracking-[0.3em] uppercase text-[#E6C687] mb-4">
                {activeSlide.mini_title || "THE DESIGN SPACE"}
              </p>
            </FadeIn>

            <SplitText
              text={activeSlide.main_title}
              as="h1"
              className="text-white font-light tracking-tight text-3xl sm:text-5xl lg:text-7xl xl:text-8xl max-w-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            />

            <FadeIn
              delay={0.7}
              className="max-w-xl mt-4 md:mt-6 flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6"
            >
              <p className="text-sm md:text-base text-white/80 leading-relaxed">
                {activeSlide.subtitle}
              </p>
              {activeSlide.cta_label && activeSlide.cta_link && (
                <MagneticButton
                  as="a"
                  href={activeSlide.cta_link}
                  data-cursor="View"
                  className="shrink-0 inline-flex items-center gap-2 px-5 md:px-6 py-3 md:py-3.5 bg-white text-[#1C1C1C] rounded-full text-[11px] tracking-[0.14em] uppercase font-medium"
                >
                  {activeSlide.cta_label}
                </MagneticButton>
              )}
            </FadeIn>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Arrow nav ────────────────────────────────────────────────── */}
      {totalSlides > 1 && (
        <>
          <motion.button
            onClick={goToPrev}
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.95 }}
            className="absolute left-3 md:left-10 top-1/2 -translate-y-1/2 w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            style={{ zIndex: 20 }}
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} className="md:hidden" />
            <ChevronLeft size={24} className="hidden md:block" />
          </motion.button>

          <motion.button
            onClick={goToNext}
            whileHover={{ scale: 1.1, x: 4 }}
            whileTap={{ scale: 0.95 }}
            className="absolute right-3 md:right-10 top-1/2 -translate-y-1/2 w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            style={{ zIndex: 20 }}
            aria-label="Next slide"
          >
            <ChevronRight size={18} className="md:hidden" />
            <ChevronRight size={24} className="hidden md:block" />
          </motion.button>
        </>
      )}

      {/* ── Dot indicators ───────────────────────────────────────────── */}
      {totalSlides > 1 && (
        <div
          className="absolute bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-2"
          style={{ zIndex: 20 }}
        >
          {sortedSlides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === activeIndex
                  ? "w-8 h-2 bg-white"
                  : "w-2 h-2 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
