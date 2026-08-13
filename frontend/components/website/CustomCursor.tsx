"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

/**
 * Premium cursor — dot + ring, dark visible design.
 *
 *  • Diamond dot — dark ink fill + gold glow, snaps to pointer instantly
 *  • Ring — dark stroke with gold accent, smooth spring lag
 *  • Dashed ring with compass ticks on interactive hover
 *  • Solid dark pill + white label on [data-cursor] elements
 *  • Press squish on both layers
 *  • z-index above lightbox (z-[99999])
 *  • Touch / reduced-motion safe
 */
export default function CustomCursor() {
  const [enabled,  setEnabled]  = useState(false);
  const [visible,  setVisible]  = useState(false);
  const [label,    setLabel]    = useState<string | null>(null);
  const [pressed,  setPressed]  = useState(false);
  const [hovering, setHovering] = useState(false);
  const rafRef = useRef<number>(0);

  // Dot — instant via rAF
  const dotX = useMotionValue(-300);
  const dotY = useMotionValue(-300);

  // Ring — spring lag
  const rawX  = useMotionValue(-300);
  const rawY  = useMotionValue(-300);
  const ringX = useSpring(rawX, { damping: 28, stiffness: 290, mass: 0.5 });
  const ringY = useSpring(rawY, { damping: 28, stiffness: 290, mass: 0.5 });

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduced) return;

    setEnabled(true);
    document.body.classList.add("ds-cursor-enabled");

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        dotX.set(e.clientX);
        dotY.set(e.clientY);
        rawX.set(e.clientX);
        rawY.set(e.clientY);
      });
      if (!visible) setVisible(true);

      const t = (e.target as HTMLElement)?.closest("[data-cursor]") as HTMLElement | null;
      setLabel(t?.getAttribute("data-cursor") ?? null);
      setHovering(!!(e.target as HTMLElement)?.closest(
        "a,button,[role='button'],input,textarea,select,label"
      ));
    };

    const onDown  = () => setPressed(true);
    const onUp    = () => setPressed(false);
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener("mousemove",  onMove);
    window.addEventListener("mousedown",  onDown);
    window.addEventListener("mouseup",    onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mouseup",    onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      document.body.classList.remove("ds-cursor-enabled");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!enabled) return null;

  const hasLabel = !!label;
  const ringSize = hasLabel ? 90 : hovering ? 50 : 38;
  const opacity  = visible ? 1 : 0;
  const dotSize  = hasLabel ? 0 : pressed ? 5 : 8;

  return (
    <>
      {/* ── Ring — z above lightbox (99999) ───────────────────────────── */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[99999] flex items-center justify-center"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          width:   ringSize,
          height:  ringSize,
          opacity,
          scale:   pressed ? 0.78 : 1,
        }}
        transition={{
          width:   { type: "spring", damping: 20, stiffness: 220 },
          height:  { type: "spring", damping: 20, stiffness: 220 },
          opacity: { duration: 0.2 },
          scale:   { type: "spring", damping: 16, stiffness: 420 },
        }}
      >
        <motion.svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
          animate={{ rotate: hovering && !hasLabel ? 45 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {hasLabel ? (
            /* Solid dark pill */
            <circle cx="50" cy="50" r="47" fill="#1C1C1C" opacity="0.93" />
          ) : hovering ? (
            /* Dashed ring with tick marks on hover */
            <>
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke="#1C1C1C"
                strokeWidth="1.5"
                strokeDasharray="7 5"
                opacity="0.75"
              />
              {/* Compass ticks at N/E/S/W */}
              {[0, 90, 180, 270].map((deg) => (
                <line
                  key={deg}
                  x1="50" y1="4" x2="50" y2="12"
                  stroke="#B8923F"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  transform={`rotate(${deg} 50 50)`}
                />
              ))}
            </>
          ) : (
            /* Default: segmented dark ring + inner gold hairline */
            <>
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke="#1C1C1C"
                strokeWidth="1.2"
                strokeDasharray="60 14"
                opacity="0.55"
              />
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="#B8923F"
                strokeWidth="0.6"
                opacity="0.35"
              />
            </>
          )}
        </motion.svg>

        {/* Label */}
        <AnimatePresence>
          {hasLabel && (
            <motion.span
              key="lbl"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "relative",
                zIndex: 1,
                fontSize: 9.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#fff",
                fontWeight: 700,
                userSelect: "none",
                textAlign: "center",
                padding: "0 6px",
                lineHeight: 1.2,
              }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Dot — diamond (rotated square), dark fill + gold glow ─────── */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[99999]"
        style={{
          x: dotX,
          y: dotY,
          translateX: "-50%",
          translateY: "-50%",
          backgroundColor: "#1C1C1C",
          rotate: 45,
          /* Gold outer glow + dark inner fill = visible on any bg */
          boxShadow: "0 0 0 1.5px #B8923F, 0 0 10px 2px rgba(184,146,63,0.5)",
        }}
        animate={{
          width:   dotSize,
          height:  dotSize,
          opacity: visible && !hasLabel ? 1 : 0,
          scale:   pressed ? 0.55 : 1,
        }}
        transition={{
          width:   { duration: 0.08 },
          height:  { duration: 0.08 },
          opacity: { duration: 0.12 },
          scale:   { type: "spring", damping: 12, stiffness: 500 },
        }}
      />
    </>
  );
}
