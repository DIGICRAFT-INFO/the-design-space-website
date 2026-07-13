"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type SplitTextProps = {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
  splitBy?: "word" | "line";
  style?: CSSProperties;
};

/** Splits `text` on spaces and reveals each word from behind an
 *  overflow-hidden mask, staggered — the site's primary heading motion. */
export default function SplitText({ text, as = "h2", className = "", delay = 0, splitBy = "word", style }: SplitTextProps) {
  const Tag = as;
  const pieces = splitBy === "word" ? text.split(" ") : [text];

  return (
    <Tag className={className} style={style}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline">
        {pieces.map((piece, i) => (
          <span key={i} className="inline-block overflow-hidden align-top pb-[0.15em] -mb-[0.15em]">
            <motion.span
              className="inline-block"
              initial={{ y: "110%" }}
              whileInView={{ y: "0%" }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.045 }}
            >
              {piece}
              {splitBy === "word" && i < pieces.length - 1 ? "\u00A0" : ""}
            </motion.span>
          </span>
        ))}
      </span>
    </Tag>
  );
}
