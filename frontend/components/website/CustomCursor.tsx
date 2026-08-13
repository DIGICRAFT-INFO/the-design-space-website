"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

/**
 * Premium cursor — dot + ring design (framer-motion), new look:
 *
 *  • Small sharp square-diamond dot — rotated 45°, snaps to pointer
 *  • Larger hollow ring — smooth spring lag, morphs on hover/label
 *  • Ring rotates slowly when idle (spin animation)
 *  • Dashed ring on interactive hover
 *  • Solid pill + label on [data-cursor] elements
 *  • Press scale effect on both layers
 *  • Touch / reduced-motion safe
 */
export default function CustomCursor() {
  const [enabled,  setEnabled]  = useState(false);
  const [visible,  setVisible]  = useState(false);
  const [label,    setLabel]    = useState<string | null>(null);
  const [pressed,  setPressed]  = useState(false);
  const [hovering, setHovering] = useState(false);

  // Dot — instant
  const dotX = useMotionValue(-300);
  const dotY = useMotionValue(-300);

  // Ring — spring lag
  const rawX = useMotionValue(-300);
  const rawY = useMotionValue(-300);
  const ringX = useSpring(rawX, { damping: 30, stiffness: 300, mass: 0.5 });
  const ringY = useSpring(rawY, { damping: 30, stiffness: 300, mass: 0.5 });

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduced) return;

    setEnabled(true);
    document.body.classList.add("ds-cursor-enabled");

    let raf = 0;
    let cx = -300, cy = -300;

    const onMove = (e: MouseEvent) => {
      cx = e.clientX; cy = e.clientY;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        dotX.set(cx); dotY.set(cy);
        rawX.set(cx); rawY.set(cy);
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
      cancelAnimationFrame(raf);
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

  const hasLabel  = !!label;
  const ringSize  = hasLabel ? 88 : hovering ? 48 : 36;
  const opacity   = visible ? 1 : 0;
  const dotSize   = hasLabel ? 0 : pressed ? 5 : 7;

  return (
    <>
      {/* ── Ring ──────────────────────────────────────────────────────── */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9998] flex items-center justify-center"
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
          scale:   pressed ? 0.8 : 1,
        }}
        transition={{
          width:   { type: "spring", damping: 22, stiffness: 240 },
          height:  { type: "spring", damping: 22, stiffness: 240 },
          opacity: { duration: 0.2 },
          scale:   { type: "spring", damping: 16, stiffness: 420 },
        }}
      >
        {/* Ring SVG — changes stroke style based on state */}
        <motion.svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={{ position: "absolute", inset: 0 }}
          animate={{ rotate: hasLabel ? 0 : hovering ? 180 : 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {hasLabel ? (
            // Solid circle when label
            <circle
              cx="50" cy="50" r="47"
              fill="var(--ds-gold)"
              opacity="0.92"
            />
          ) : hovering ? (
            // Dashed ring on hover
            <>
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke="var(--ds-gold)"
                strokeWidth="1.5"
                strokeDasharray="6 5"
                opacity="0.7"
              />
              {/* 4 corner tick marks */}
              {[0, 90, 180, 270].map((deg) => (
                <line
                  key={deg}
                  x1="50" y1="6"
                  x2="50" y2="13"
                  stroke="var(--ds-gold)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  transform={`rotate(${deg} 50 50)`}
                  opacity="0.9"
                />
              ))}
            </>
          ) : (
            // Default: thin ring with 4 small gaps
            <>
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke="var(--ds-gold)"
                strokeWidth="1"
                strokeDasharray="55 15"
                opacity="0.55"
              />
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke="var(--ds-gold)"
                strokeWidth="0.5"
                opacity="0.2"
              />
            </>
          )}
        </motion.svg>

        {/* Label text */}
        <AnimatePresence>
          {hasLabel && (
            <motion.span
              key="lbl"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.16 }}
              style={{
                fontSize: 9.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#fff",
                fontWeight: 700,
                userSelect: "none",
                position: "relative",
                zIndex: 1,
                textAlign: "center",
                padding: "0 8px",
                lineHeight: 1.2,
              }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Dot — diamond shape (rotated square) ──────────────────────── */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9999]"
        style={{
          x: dotX,
          y: dotY,
          translateX: "-50%",
          translateY: "-50%",
          backgroundColor: "var(--ds-gold)",
          rotate: 45,
          boxShadow: "0 0 8px 1px var(--ds-gold)",
        }}
        animate={{
          width:   dotSize,
          height:  dotSize,
          opacity: visible && !hasLabel ? 1 : 0,
          scale:   pressed ? 0.6 : 1,
        }}
        transition={{
          width:   { duration: 0.1 },
          height:  { duration: 0.1 },
          opacity: { duration: 0.15 },
          scale:   { type: "spring", damping: 14, stiffness: 500 },
        }}
      />
    </>
  );
}
