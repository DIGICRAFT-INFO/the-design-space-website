"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type RevealImageProps = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  direction?: "left" | "bottom";
  delay?: number;
  style?: CSSProperties;
  cursorLabel?: string;
};

const CLOSED = {
  left: "polygon(0 0, 0 0, 0 100%, 0 100%)",
  bottom: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)",
} as const;

const OPEN = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";

/** Wrap any <img> in this to get the site's signature "curtain" reveal:
 *  the image parts open like theatre curtains as it scrolls into view,
 *  with a slow contra-zoom underneath — evoking a room being unveiled. */
export default function RevealImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  direction = "left",
  delay = 0,
  style,
  cursorLabel,
}: RevealImageProps) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={style} data-cursor={cursorLabel}>
      <motion.div
        initial={{ clipPath: CLOSED[direction] }}
        whileInView={{ clipPath: OPEN }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 1.1, ease: EASE, delay }}
        className="absolute inset-0"
      >
        <motion.img
          src={src}
          alt={alt}
          initial={{ scale: 1.18 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 1.4, ease: EASE, delay }}
          className={`w-full h-full object-cover ${imgClassName}`}
        />
      </motion.div>
    </div>
  );
}
