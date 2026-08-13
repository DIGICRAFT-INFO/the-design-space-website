"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

/**
 * Premium dual-layer custom cursor:
 *  • Small sharp gold dot — snaps instantly to pointer
 *  • Larger translucent ring — follows with smooth spring lag
 *  • Expands + shows label on [data-cursor="..."] elements
 *  • Scales down on mousedown (press effect)
 *  • Fades out on mouse-leave, fades in on enter
 *  • Hides on touch / keyboard-only devices
 */
export default function CustomCursor() {
  const [enabled, setEnabled]     = useState(false);
  const [visible, setVisible]     = useState(false);
  const [label, setLabel]         = useState<string | null>(null);
  const [pressed, setPressed]     = useState(false);
  const [hovering, setHovering]   = useState(false); // hovering an interactive element

  // ── Dot (snappy) ──────────────────────────────────────────────────────────
  const dotX = useMotionValue(-300);
  const dotY = useMotionValue(-300);

  // ── Ring (laggy spring) ───────────────────────────────────────────────────
  const ringX = useMotionValue(-300);
  const ringY = useMotionValue(-300);
  const springCfg = { damping: 26, stiffness: 280, mass: 0.6 };
  const rX = useSpring(ringX, springCfg);
  const rY = useSpring(ringY, springCfg);

  const rafRef = useRef<number | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const cx = e.clientX;
    const cy = e.clientY;

    // Dot snaps immediately via rAF
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      dotX.set(cx);
      dotY.set(cy);
      ringX.set(cx);
      ringY.set(cy);
    });

    if (!visible) setVisible(true);

    const target = (e.target as HTMLElement)?.closest("[data-cursor]") as HTMLElement | null;
    const interactive = (e.target as HTMLElement)?.closest(
      "a, button, [role='button'], input, textarea, select, label, [tabindex]"
    );

    setLabel(target?.getAttribute("data-cursor") ?? null);
    setHovering(!!interactive);
  }, [visible, dotX, dotY, ringX, ringY]);

  const onMouseDown  = useCallback(() => setPressed(true),  []);
  const onMouseUp    = useCallback(() => setPressed(false), []);
  const onMouseLeave = useCallback(() => setVisible(false), []);
  const onMouseEnter = useCallback(() => setVisible(true),  []);

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduced) return;

    setEnabled(true);
    document.body.classList.add("ds-cursor-enabled");

    window.addEventListener("mousemove",  onMouseMove);
    window.addEventListener("mousedown",  onMouseDown);
    window.addEventListener("mouseup",    onMouseUp);
    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    document.documentElement.addEventListener("mouseenter", onMouseEnter);

    return () => {
      window.removeEventListener("mousemove",  onMouseMove);
      window.removeEventListener("mousedown",  onMouseDown);
      window.removeEventListener("mouseup",    onMouseUp);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      document.documentElement.removeEventListener("mouseenter", onMouseEnter);
      document.body.classList.remove("ds-cursor-enabled");
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onMouseMove, onMouseDown, onMouseUp, onMouseLeave, onMouseEnter]);

  if (!enabled) return null;

  const hasLabel   = !!label;
  const ringSize   = hasLabel ? 96 : hovering ? 44 : 38;
  const ringOpacity = !visible ? 0 : hasLabel ? 0.9 : hovering ? 0.55 : 0.35;
  const dotOpacity  = !visible ? 0 : hasLabel ? 0 : 1;

  return (
    <>
      {/* ── Ring ─────────────────────────────────────────────────────── */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9998] rounded-full flex items-center justify-center"
        style={{
          x: rX,
          y: rY,
          translateX: "-50%",
          translateY: "-50%",
          border: hasLabel
            ? "none"
            : `1.5px solid var(--ds-gold)`,
          backgroundColor: hasLabel ? "var(--ds-gold)" : "transparent",
        }}
        animate={{
          width:   ringSize,
          height:  ringSize,
          opacity: ringOpacity,
          scale:   pressed ? 0.82 : 1,
        }}
        transition={{
          width:   { type: "spring", damping: 20, stiffness: 220 },
          height:  { type: "spring", damping: 20, stiffness: 220 },
          opacity: { duration: 0.2 },
          scale:   { type: "spring", damping: 18, stiffness: 400 },
        }}
      >
        <AnimatePresence>
          {hasLabel && (
            <motion.span
              key="label"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="text-[9.5px] tracking-[0.18em] uppercase text-white font-semibold text-center px-2 leading-tight select-none"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Dot ──────────────────────────────────────────────────────── */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full"
        style={{
          x: dotX,
          y: dotY,
          translateX: "-50%",
          translateY: "-50%",
          backgroundColor: "var(--ds-gold)",
        }}
        animate={{
          width:   pressed ? 6 : hovering ? 5 : 7,
          height:  pressed ? 6 : hovering ? 5 : 7,
          opacity: dotOpacity,
          scale:   pressed ? 0.7 : 1,
        }}
        transition={{
          width:   { duration: 0.12 },
          height:  { duration: 0.12 },
          opacity: { duration: 0.15 },
          scale:   { type: "spring", damping: 18, stiffness: 500 },
        }}
      />
    </>
  );
}
