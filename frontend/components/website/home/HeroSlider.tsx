"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SplitText from "@/components/website/SplitText";
import FadeIn from "@/components/website/FadeIn";
import MagneticButton from "@/components/website/MagneticButton";
import type { HeroSlide } from "@/services/websiteService";

type Props = {
  slides: HeroSlide[];
  autoPlayInterval?: number; // ms — default 5000
};

export default function HeroSlider({ slides, autoPlayInterval = 5000 }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 1 for next, -1 for prev

  const sortedSlides = [...slides].sort((a, b) => a.sort_order - b.sort_order);
  const totalSlides = sortedSlides.length;

  const goToNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = useCallback((index: number) => {
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  }, [activeIndex]);

  // Auto-play
  useEffect(() => {
    if (totalSlides <= 1) return;
    const timer = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(timer);
  }, [goToNext, autoPlayInterval, totalSlides]);

  if (totalSlides === 0) {
    return (
      <section className="relative h-[100svh] w-full overflow-hidden flex items-end bg-[var(--ds-bg-alt)]">
        <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 md:px-10 pb-16 md:pb-20">
          <p className="text-white/60">No hero slides configured.</p>
        </div>
      </section>
    );
  }

  const activeSlide = sortedSlides[activeIndex];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  return (
    <section className="relative h-[100svh] w-full overflow-hidden flex items-end">
      {/* Slides */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={activeSlide.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <img
            src={activeSlide.image_url}
            alt={activeSlide.main_title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
        </motion.div>
      </AnimatePresence>

      {/* Content overlay */}
      <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 md:px-10 pb-16 md:pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${activeSlide.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <FadeIn>
              <p className="text-[12px] tracking-[0.3em] uppercase text-[#E6C687] mb-4">
                {activeSlide.mini_title || "THE DESIGN SPACE"}
              </p>
            </FadeIn>
            <SplitText
              text={activeSlide.main_title}
              as="h1"
              className="text-white font-light tracking-tight text-5xl lg:text-8xl max-w-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            />
            <FadeIn delay={0.7} className="max-w-xl mt-6 flex flex-col sm:flex-row sm:items-center gap-6">
              <p className="text-base text-white/80 leading-relaxed">
                {activeSlide.subtitle}
              </p>
              {activeSlide.cta_label && activeSlide.cta_link && (
                <MagneticButton
                  as="a"
                  href={activeSlide.cta_link}
                  data-cursor="View"
                  className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 bg-white text-[#1C1C1C] rounded-full text-[11px] tracking-[0.14em] uppercase font-medium"
                >
                  {activeSlide.cta_label}
                </MagneticButton>
              )}
            </FadeIn>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrow buttons */}
      {totalSlides > 1 && (
        <>
          {/* Left arrow */}
          <motion.button
            onClick={goToPrev}
            whileHover={{ scale: 1.1, x: -4 }}
            whileTap={{ scale: 0.95 }}
            className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft size={24} />
          </motion.button>

          {/* Right arrow */}
          <motion.button
            onClick={goToNext}
            whileHover={{ scale: 1.1, x: 4 }}
            whileTap={{ scale: 0.95 }}
            className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight size={24} />
          </motion.button>
        </>
      )}

      {/* Dot indicators */}
      {totalSlides > 1 && (
        <div className="absolute bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {sortedSlides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 ${
                index === activeIndex
                  ? "w-8 h-2 bg-white"
                  : "w-2 h-2 bg-white/40 hover:bg-white/60"
              } rounded-full`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
