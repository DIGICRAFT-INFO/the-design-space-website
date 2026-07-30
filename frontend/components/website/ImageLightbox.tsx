"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

export type LightboxImage = {
  src: string;
  alt?: string;
  caption?: string;
};

type Props = {
  images: LightboxImage[];
  initialIndex?: number;
  onClose: () => void;
};

export default function ImageLightbox({ images, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [direction, setDirection] = useState(0);

  const current = images[index];
  const total = images.length;

  const prev = useCallback(() => {
    setDirection(-1);
    setZoomed(false);
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const next = useCallback(() => {
    setDirection(1);
    setZoomed(false);
    setIndex((i) => (i + 1) % total);
  }, [total]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Touch swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    setTouchStart(null);
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? "60%" : "-60%", opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-60%" : "60%", opacity: 0, scale: 0.95 }),
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/95 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-gradient-to-b from-black/60 to-transparent">
          <p className="text-white/60 text-xs md:text-sm font-medium tracking-widest">
            {index + 1} / {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomed((z) => !z)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label={zoomed ? "Zoom out" : "Zoom in"}
            >
              {zoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="relative z-10 w-full h-full flex items-center justify-center px-12 md:px-20 py-16">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center w-full h-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.src}
                alt={current.alt || ""}
                onClick={() => setZoomed((z) => !z)}
                className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-zoom-in transition-transform duration-500 select-none ${
                  zoomed
                    ? "scale-150 md:scale-[2] cursor-zoom-out"
                    : "scale-100"
                }`}
                style={{ maxHeight: "calc(100vh - 8rem)", maxWidth: "calc(100vw - 6rem)" }}
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Caption */}
        {current.caption && (
          <div className="absolute bottom-14 md:bottom-16 inset-x-0 z-10 text-center px-6">
            <p className="text-white/70 text-xs md:text-sm">{current.caption}</p>
          </div>
        )}

        {/* Navigation arrows */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/10 hover:border-white/30 transition-all"
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/10 hover:border-white/30 transition-all"
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {total > 1 && total <= 12 && (
          <div className="absolute bottom-4 md:bottom-6 inset-x-0 z-10 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); setZoomed(false); }}
                className={`transition-all duration-300 rounded-full ${
                  i === index ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
