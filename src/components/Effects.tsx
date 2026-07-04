"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./Effects.module.css";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ *
 *  Interactive magnetic dot-grid background.
 *  Dots sit on a grid, gently drift, and warp away from the cursor
 *  (a soft "lens" that also brightens nearby dots).
 * ------------------------------------------------------------------ */
const DotField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = prefersReducedMotion();
    const GAP = 40;
    const INFLUENCE = 170;

    let width = 0;
    let height = 0;
    let dpr = 1;
    type Dot = { x: number; y: number };
    let dots: Dot[] = [];

    // Pointer lives slightly off-screen until the user moves.
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      const cols = Math.ceil(width / GAP) + 1;
      const rows = Math.ceil(height / GAP) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dots.push({ x: c * GAP, y: r * GAP });
        }
      }
    };

    let raf = 0;
    let t = 0;

    const draw = () => {
      t += 0.008;
      // Ease the pointer toward its target for buttery motion.
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        // Idle drift so it's alive even without the cursor.
        const driftX = Math.sin(t + d.y * 0.02) * 1.2;
        const driftY = Math.cos(t + d.x * 0.02) * 1.2;

        let x = d.x + driftX;
        let y = d.y + driftY;
        let radius = 1.1;
        let alpha = 0.14;

        const dx = d.x - pointer.x;
        const dy = d.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < INFLUENCE) {
          const f = 1 - dist / INFLUENCE; // 0..1
          const push = f * f * 26;
          const ang = Math.atan2(dy, dx);
          x += Math.cos(ang) * push;
          y += Math.sin(ang) * push;
          radius += f * 2.6;
          alpha += f * 0.5;
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(17,17,17,${alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      for (const d of dots) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(17,17,17,0.12)";
        ctx.fill();
      }
    };

    const onMove = (e: PointerEvent) => {
      pointer.tx = e.clientX;
      pointer.ty = e.clientY;
    };
    const onLeave = () => {
      pointer.tx = -9999;
      pointer.ty = -9999;
    };
    const onResize = () => {
      build();
      if (reduce) drawStatic();
    };

    build();
    if (reduce) {
      drawStatic();
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      raf = requestAnimationFrame(draw);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.dotCanvas} aria-hidden />;
};

/* ------------------------------------------------------------------ *
 *  Scroll progress bar (top of viewport).
 * ------------------------------------------------------------------ */
const ScrollProgress: React.FC = () => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = barRef.current;
      if (!el) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? doc.scrollTop / max : 0;
      el.style.transform = `scaleX(${p})`;
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return <div ref={barRef} className={styles.progress} aria-hidden />;
};

/* ------------------------------------------------------------------ *
 *  Custom cursor — a blend-difference ring that lags a solid dot and
 *  swells over interactive elements. Pointer/fine devices only.
 * ------------------------------------------------------------------ */
const Cursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: mouse.x, y: mouse.y };
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
      }
      const t = e.target as HTMLElement;
      const interactive = t.closest(
        "a, button, [data-cursor], .pill, input, textarea"
      );
      ringRef.current?.classList.toggle(styles.ringActive, !!interactive);
    };

    const loop = () => {
      ring.x += (mouse.x - ring.x) * 0.18;
      ring.y += (mouse.y - ring.y) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.x}px, ${ring.y}px)`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    document.body.classList.add(styles.hideNativeCursor);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      document.body.classList.remove(styles.hideNativeCursor);
    };
  }, []);

  if (!enabled) return null;
  return (
    <>
      <div ref={ringRef} className={styles.cursorRing} aria-hidden />
      <div ref={dotRef} className={styles.cursorDot} aria-hidden />
    </>
  );
};

export const SiteEffects: React.FC = () => (
  <>
    <DotField />
    <ScrollProgress />
    <Cursor />
  </>
);
