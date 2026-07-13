"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const MotionButton = motion.button;
const MotionAnchor = motion.a;

type MagneticButtonProps = {
  as?: "button" | "a";
  href?: string;
  children: ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  "data-cursor"?: string;
};

export default function MagneticButton({
  as = "button",
  href,
  children,
  className = "",
  strength = 0.35,
  onClick,
  type = "button",
  disabled,
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping: 15, stiffness: 200, mass: 0.4 });
  const springY = useSpring(y, { damping: 15, stiffness: 200, mass: 0.4 });

  function handleMouseMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * strength);
    y.set(relY * strength);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const sharedProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- motion.button and motion.a expect different ref element types; this component intentionally shares one ref across both branches, using only DOM methods common to both (getBoundingClientRect).
    ref: ref as any,
    style: { x: springX, y: springY },
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    onClick,
    className,
    ...rest,
  };

  if (as === "a" && href) {
    return (
      <MotionAnchor href={href} {...sharedProps}>
        {children}
      </MotionAnchor>
    );
  }

  return (
    <MotionButton type={type} disabled={disabled} {...sharedProps}>
      {children}
    </MotionButton>
  );
}
