"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/** Attach `data-cursor="View Project"` (or any label) to an element to make
 *  the cursor expand and show that label while hovering it. */
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { damping: 28, stiffness: 320, mass: 0.4 });
  const springY = useSpring(y, { damping: 28, stiffness: 320, mass: 0.4 });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || prefersReducedMotion) return;

    setEnabled(true);
    document.body.classList.add("ds-cursor-enabled");

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);

      const target = (e.target as HTMLElement)?.closest("[data-cursor]") as HTMLElement | null;
      setLabel(target?.getAttribute("data-cursor") || null);
    };

    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mousemove", move);
      document.body.classList.remove("ds-cursor-enabled");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!enabled) return null;

  return (
    <motion.div
      ref={rootRef}
      className="pointer-events-none fixed top-0 left-0 z-[999] flex items-center justify-center rounded-full"
      style={{
        x: springX,
        y: springY,
        translateX: "-50%",
        translateY: "-50%",
        mixBlendMode: "difference",
        backgroundColor: "#FDFDFD",
      }}
      animate={{
        width: label ? 92 : 12,
        height: label ? 92 : 12,
      }}
      transition={{ type: "spring", damping: 22, stiffness: 260 }}
    >
      {label && (
        <span className="text-[10px] tracking-[0.15em] uppercase text-black font-medium text-center px-2 leading-tight">
          {label}
        </span>
      )}
    </motion.div>
  );
}
