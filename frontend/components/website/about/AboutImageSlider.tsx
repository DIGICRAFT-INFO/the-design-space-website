"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveMediaUrl } from "@/lib/media";
import type { SliderImage } from "@/services/websiteService";

interface Props {
  images: SliderImage[];
  /** Auto-advance interval in ms. Default 5000. */
  interval?: number;
}

const FALLBACK_IMAGES: SliderImage[] = [
  { id: "f1", image_url: "/logo.png", alt_text: "The Design Space", sort_order: 0 },
];

export default function AboutImageSlider({ images, interval = 5000 }: Props) {
  const slides = (images.length > 0 ? images : FALLBACK_IMAGES)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (idx: number) => setActive(((idx % slides.length) + slides.length) % slides.length),
    [slides.length]
  );

  // Reset and start autoplay
  useEffect(() => {
    if (paused || slides.length <= 1) return;
    timerRef.current = setTimeout(() => goTo(active + 1), interval);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, paused, interval, goTo, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ aspectRatio: "4 / 3" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Slide track ─────────────────────────────────────────────── */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== active}
          className="absolute inset-0 transition-opacity"
          style={{
            opacity: i === active ? 1 : 0,
            transition: "opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: i === active ? 1 : 0,
          }}
        >
          <div
            className="w-full h-full"
            style={{
              transform: i === active ? "scale(1)" : "scale(1.04)",
              transition: "transform 6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
          >
            <img
              src={resolveMediaUrl(slide.image_url)}
              alt={slide.alt_text || "The Design Space"}
              className="w-full h-full object-cover"
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.png";
              }}
            />
          </div>
        </div>
      ))}

      {/* ── Hover zoom overlay (subtle) ─────────────────────────────── */}
      <div
        className="absolute inset-0 z-10 transition-transform duration-700 ease-out"
        style={{ transformOrigin: "center" }}
      />

      {/* ── Pagination dots ─────────────────────────────────────────── */}
      {slides.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
          role="tablist"
          aria-label="Slider navigation"
        >
          {slides.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === active}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => { goTo(i); setPaused(false); }}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === active ? 22 : 7,
                height: 7,
                background: i === active ? "#C49A45" : "rgba(255,255,255,0.65)",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}

      {/* ── Subtle gradient vignette bottom ──────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(26,20,10,0.28) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
