"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Premium 3D-metallic arrow cursor — brand gold/champagne face, dark bronze
 * bevelled edge. Matches the 3D arrow aesthetic in the reference image but
 * uses The Design Space palette.
 *
 *  ① 3D metallic SVG arrow  — drawn on canvas, snaps to pointer (rAF)
 *  ② Soft trailing glow     — faint gold halo that lags behind (spring)
 *  ③ Particle burst          — gold + copper sparks on click
 *  ④ Press squish            — arrow scales + rotates slightly on mousedown
 *  ⑤ Label bubble            — elegant pill expands on [data-cursor] targets
 *  ⑥ Hover shimmer ring      — thin ring orbits arrow on interactive elements
 *  ⑦ Touch / reduced-motion  — disabled, native cursor restored
 */

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; decay: number;
  size: number; hue: number;
}

// ─── Arrow shape (standard pointer arrow, in local coords) ────────────────
// tip at (0,0), scaled to ~28px height
const ARROW_PATH: [number, number][] = [
  [0, 0],
  [0, 22],
  [5.5, 16.5],
  [10, 26],
  [13, 25],
  [8.5, 15],
  [15, 15],
];

// Brand palette
const GOLD_HEX   = "#C8922A";   // warm champagne gold face (slightly brighter for canvas)
const BRONZE_HEX = "#3A2810";   // dark bronze edge / shadow
const COPPER_HEX = "#8B5E3C";   // mid copper for bevel

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  rotation: number,
  alpha: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  // ── Shadow ──────────────────────────────────────────────────────────────
  ctx.shadowColor  = "rgba(0,0,0,0.45)";
  ctx.shadowBlur   = 14;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;

  // ── Build the arrow path ─────────────────────────────────────────────
  const buildPath = () => {
    ctx.beginPath();
    ctx.moveTo(ARROW_PATH[0][0], ARROW_PATH[0][1]);
    for (let i = 1; i < ARROW_PATH.length; i++) {
      ctx.lineTo(ARROW_PATH[i][0], ARROW_PATH[i][1]);
    }
    ctx.closePath();
  };

  // ── Dark bronze base (thick stroke = 3D bevel depth) ────────────────
  buildPath();
  ctx.lineJoin   = "round";
  ctx.lineWidth  = 4.5;
  ctx.strokeStyle = BRONZE_HEX;
  ctx.stroke();

  // ── Copper mid-bevel ────────────────────────────────────────────────
  buildPath();
  ctx.lineWidth   = 2.5;
  ctx.strokeStyle = COPPER_HEX;
  ctx.stroke();

  // ── Gold face fill — radial gradient for 3D convex sheen ────────────
  const grad = ctx.createRadialGradient(4, 4, 0, 7, 7, 22);
  grad.addColorStop(0.00, "#F0D080");   // highlight specular
  grad.addColorStop(0.18, "#E8C060");   // bright face
  grad.addColorStop(0.50, GOLD_HEX);    // brand gold mid
  grad.addColorStop(0.80, "#9A6A1A");   // shadow edge
  grad.addColorStop(1.00, "#5A3C08");   // deep bronze shadow

  ctx.shadowColor  = "transparent";
  ctx.shadowBlur   = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  buildPath();
  ctx.fillStyle = grad;
  ctx.fill();

  // ── Thin top-highlight edge line ─────────────────────────────────────
  buildPath();
  ctx.lineWidth   = 0.8;
  ctx.strokeStyle = "rgba(255,240,180,0.65)";
  ctx.stroke();

  ctx.restore();
}

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const labelRef   = useRef<HTMLDivElement>(null);

  const mouse    = useRef({ x: -300, y: -300 });
  const glow     = useRef({ x: -300, y: -300 });
  const glowVx   = useRef(0);
  const glowVy   = useRef(0);
  const visible  = useRef(false);
  const pressing = useRef(false);
  const hovering = useRef(false);
  const labelTxt = useRef<string | null>(null);
  const particles= useRef<Particle[]>([]);
  const tick     = useRef(0);
  const rafId    = useRef(0);

  // Arrow animation state
  const arrowScale = useRef(1);
  const arrowRot   = useRef(0);

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduced) return;

    setEnabled(true);
    document.body.classList.add("ds-cursor-enabled");

    const canvas = canvasRef.current!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const spawnParticles = (x: number, y: number) => {
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.8 + Math.random() * 3.8;
        // alternate gold and copper sparks
        particles.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 1,
          decay: 0.035 + Math.random() * 0.045,
          size: 1.5 + Math.random() * 3,
          hue: Math.random() > 0.5 ? 38 : 22, // gold vs copper hue
        });
      }
    };

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (!visible.current) visible.current = true;

      const t = (e.target as HTMLElement)?.closest("[data-cursor]") as HTMLElement | null;
      labelTxt.current = t?.getAttribute("data-cursor") ?? null;
      hovering.current = !!(e.target as HTMLElement)?.closest(
        "a, button, [role='button'], input, textarea, select, label"
      );
    };

    const onDown = () => {
      pressing.current = true;
      spawnParticles(mouse.current.x + 2, mouse.current.y + 4);
    };
    const onUp    = () => { pressing.current = false; };
    const onLeave = () => { visible.current = false; };
    const onEnter = () => { visible.current = true; };

    window.addEventListener("mousemove",  onMove);
    window.addEventListener("mousedown",  onDown);
    window.addEventListener("mouseup",    onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    const ctx = canvas.getContext("2d")!;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      tick.current++;

      if (!visible.current) { rafId.current = requestAnimationFrame(loop); return; }

      const mx = mouse.current.x;
      const my = mouse.current.y;

      // ── Spring glow follows mouse ──────────────────────────────────────
      const stiff = 0.11, damp = 0.70;
      glowVx.current += (mx - glow.current.x) * stiff;
      glowVy.current += (my - glow.current.y) * stiff;
      glowVx.current *= damp;
      glowVy.current *= damp;
      glow.current.x += glowVx.current;
      glow.current.y += glowVy.current;

      // ── Trailing glow halo ─────────────────────────────────────────────
      const glowR = pressing.current ? 18 : hovering.current ? 30 : 22;
      const grad = ctx.createRadialGradient(
        glow.current.x, glow.current.y, 0,
        glow.current.x, glow.current.y, glowR * 2.2
      );
      grad.addColorStop(0,    "rgba(200,146,42,0.22)");
      grad.addColorStop(0.45, "rgba(200,146,42,0.08)");
      grad.addColorStop(1,    "rgba(200,146,42,0)");
      ctx.beginPath();
      ctx.arc(glow.current.x, glow.current.y, glowR * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // ── Hover shimmer ring ─────────────────────────────────────────────
      if (hovering.current && !labelTxt.current) {
        const orbitR  = 24;
        const orbitAlpha = 0.35 + Math.sin(tick.current * 0.05) * 0.12;
        ctx.beginPath();
        ctx.arc(mx + 7, my + 8, orbitR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200,146,42,${orbitAlpha})`;
        ctx.lineWidth   = 1;
        ctx.stroke();

        // small rotating dot on ring
        const dotAngle = tick.current * 0.04;
        const dotX = mx + 7 + Math.cos(dotAngle) * orbitR;
        const dotY = my + 8 + Math.sin(dotAngle) * orbitR;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
        ctx.fillStyle = GOLD_HEX;
        ctx.fill();
      }

      // ── Arrow animation ────────────────────────────────────────────────
      const targetScale = pressing.current ? 0.78 : hovering.current ? 0.92 : 1.0;
      const targetRot   = pressing.current ? 0.12 : 0;
      arrowScale.current += (targetScale - arrowScale.current) * 0.18;
      arrowRot.current   += (targetRot   - arrowRot.current)   * 0.18;

      drawArrow(ctx, mx, my, arrowScale.current, arrowRot.current, 1.0);

      // ── Particles ─────────────────────────────────────────────────────
      particles.current = particles.current.filter(p => p.life > 0);
      for (const p of particles.current) {
        p.x   += p.vx;
        p.y   += p.vy;
        p.vy  += 0.15;
        p.vx  *= 0.91;
        p.life -= p.decay;

        const r = p.size * p.life;
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
        pg.addColorStop(0,   `hsla(${p.hue},75%,65%,${p.life * 0.9})`);
        pg.addColorStop(0.5, `hsla(${p.hue},65%,45%,${p.life * 0.5})`);
        pg.addColorStop(1,   `hsla(${p.hue},55%,30%,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();
      }

      // ── Label bubble ───────────────────────────────────────────────────
      if (labelRef.current) {
        if (labelTxt.current) {
          labelRef.current.textContent = labelTxt.current;
          labelRef.current.style.opacity = "1";
          labelRef.current.style.transform =
            `translate(${mx + 22}px, ${my - 6}px)`;
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
      {/* Full-viewport canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[9998]"
      />

      {/* Label pill — positioned via JS in loop */}
      <div
        ref={labelRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] select-none"
        style={{
          background: GOLD_HEX,
          color: "#fff",
          fontSize: 9.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
          padding: "4px 10px",
          borderRadius: 99,
          boxShadow: `0 2px 12px rgba(200,146,42,0.45)`,
          opacity: 0,
          transition: "opacity 0.15s",
          willChange: "transform, opacity",
          whiteSpace: "nowrap",
          border: `1px solid ${BRONZE_HEX}44`,
        }}
      />
    </>
  );
}
