"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Next-gen cursor — no framer-motion dependency, pure canvas + DOM.
 *
 *  ① Sharp gold crosshair-dot  — snaps to pointer (rAF, zero lag)
 *  ② Elastic trailing ring     — spring physics, lags behind beautifully
 *  ③ Ghost trail               — 8 fading echo-dots follow the ring
 *  ④ Particle burst            — 10 gold sparks on every click
 *  ⑤ Label bubble              — expands on [data-cursor] elements
 *  ⑥ Morphs on hover           — ring squishes into a pill on interactive
 *  ⑦ Breath pulse              — idle ring pulses slowly
 *  ⑧ Touch / reduced-motion    — fully disabled, native cursor restored
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0→1
  decay: number;
  size: number;
}

const GOLD = "#C8922A";
const GOLD_LIGHT = "rgba(200,146,42,";
const TRAIL_LEN = 10;

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const dotRef     = useRef<HTMLDivElement>(null);
  const labelRef   = useRef<HTMLDivElement>(null);

  // ── live state in refs (no re-renders in hot path) ───────────────────────
  const mouse      = useRef({ x: -300, y: -300 });
  const ring       = useRef({ x: -300, y: -300 });
  const trail      = useRef<{ x: number; y: number }[]>([]);
  const particles  = useRef<Particle[]>([]);
  const visible    = useRef(false);
  const pressing   = useRef(false);
  const hovering   = useRef(false);   // over interactive element
  const labelText  = useRef<string | null>(null);
  const idleTick   = useRef(0);
  const rafId      = useRef<number>(0);

  // ── spring config ─────────────────────────────────────────────────────────
  const vx = useRef(0);
  const vy = useRef(0);

  const spawnParticles = useCallback((x: number, y: number) => {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2.5 + Math.random() * 3.5;
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.04 + Math.random() * 0.04,
        size: 2 + Math.random() * 3,
      });
    }
  }, []);

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduced) return;

    setEnabled(true);
    document.body.classList.add("ds-cursor-enabled");

    // ── canvas fill viewport ─────────────────────────────────────────────
    const canvas = canvasRef.current!;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── event listeners ───────────────────────────────────────────────────
    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (!visible.current) visible.current = true;
      idleTick.current = 0;

      // label detection
      const t = (e.target as HTMLElement)?.closest("[data-cursor]") as HTMLElement | null;
      labelText.current = t?.getAttribute("data-cursor") ?? null;

      // interactive detection
      hovering.current = !!(e.target as HTMLElement)?.closest(
        "a, button, [role='button'], input, textarea, select, label"
      );

      // update dot immediately
      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
      }
    };

    const onDown  = () => { pressing.current = true;  spawnParticles(mouse.current.x, mouse.current.y); };
    const onUp    = () => { pressing.current = false; };
    const onLeave = () => { visible.current = false; };
    const onEnter = () => { visible.current = true; };

    window.addEventListener("mousemove",  onMove);
    window.addEventListener("mousedown",  onDown);
    window.addEventListener("mouseup",    onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    // ── animation loop ────────────────────────────────────────────────────
    const ctx = canvas.getContext("2d")!;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      idleTick.current++;

      const mx = mouse.current.x;
      const my = mouse.current.y;
      const rx = ring.current.x;
      const ry = ring.current.y;

      if (!visible.current) {
        rafId.current = requestAnimationFrame(loop);
        return;
      }

      // ── spring physics for ring ─────────────────────────────────────
      const stiffness = 0.14;
      const damping   = 0.72;
      vx.current += (mx - rx) * stiffness;
      vy.current += (my - ry) * stiffness;
      vx.current *= damping;
      vy.current *= damping;
      ring.current.x += vx.current;
      ring.current.y += vy.current;

      // ── trail ────────────────────────────────────────────────────────
      trail.current.push({ x: ring.current.x, y: ring.current.y });
      if (trail.current.length > TRAIL_LEN) trail.current.shift();

      // draw trail
      for (let i = 0; i < trail.current.length; i++) {
        const t = i / trail.current.length;          // 0→1
        const alpha = t * 0.25;
        const r = 3 + t * 6;
        ctx.beginPath();
        ctx.arc(trail.current[i].x, trail.current[i].y, r, 0, Math.PI * 2);
        ctx.fillStyle = GOLD_LIGHT + alpha + ")";
        ctx.fill();
      }

      // ── idle breath pulse ────────────────────────────────────────────
      const breath  = 1 + Math.sin(idleTick.current * 0.025) * 0.08;

      // ── ring ─────────────────────────────────────────────────────────
      const hasLabel  = !!labelText.current;
      const baseR     = hasLabel ? 44 : hovering.current ? 22 : 18;
      const targetR   = baseR * breath * (pressing.current ? 0.78 : 1);
      const scaleX    = hovering.current && !hasLabel ? 1.45 : 1;   // pill squish

      ctx.save();
      ctx.translate(ring.current.x, ring.current.y);
      ctx.scale(scaleX, 1);

      if (hasLabel) {
        // solid fill pill
        ctx.beginPath();
        ctx.arc(0, 0, targetR, 0, Math.PI * 2);
        ctx.fillStyle = GOLD;
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // hollow ring — double stroke for depth
        ctx.beginPath();
        ctx.arc(0, 0, targetR, 0, Math.PI * 2);
        ctx.strokeStyle = GOLD_LIGHT + "0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, targetR - 2, 0, Math.PI * 2);
        ctx.strokeStyle = GOLD_LIGHT + "0.25)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();

      // ── particles ────────────────────────────────────────────────────
      particles.current = particles.current.filter(p => p.life > 0);
      for (const p of particles.current) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.12;   // gravity
        p.vx *= 0.93;
        p.life -= p.decay;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = GOLD_LIGHT + (p.life * 0.9) + ")";
        ctx.fill();
      }

      // ── label on ring ────────────────────────────────────────────────
      if (labelRef.current) {
        const lbl = labelText.current;
        if (lbl) {
          labelRef.current.textContent = lbl;
          labelRef.current.style.opacity   = "1";
          labelRef.current.style.transform =
            `translate(${ring.current.x}px, ${ring.current.y}px) translate(-50%, -50%)`;
        } else {
          labelRef.current.style.opacity = "0";
        }
      }

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mouseup",    onUp);
      window.removeEventListener("resize",     resize);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      document.body.classList.remove("ds-cursor-enabled");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Full-viewport canvas — trail, ring, particles */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[9997]"
        style={{ mixBlendMode: "normal" }}
      />

      {/* Sharp dot — updated directly via style, no React re-render */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full"
        style={{
          width: 8,
          height: 8,
          backgroundColor: GOLD,
          boxShadow: `0 0 6px 1px ${GOLD}88`,
          willChange: "transform",
          transform: "translate(-300px, -300px)",
        }}
      />

      {/* Label text — positioned via style in the loop */}
      <div
        ref={labelRef}
        className="pointer-events-none fixed top-0 left-0 z-[9998] select-none"
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#fff",
          fontWeight: 600,
          opacity: 0,
          transition: "opacity 0.15s",
          willChange: "transform, opacity",
          whiteSpace: "nowrap",
        }}
      />
    </>
  );
}
