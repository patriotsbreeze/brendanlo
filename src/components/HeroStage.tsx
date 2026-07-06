"use client";

import React, { useEffect, useRef } from "react";
import styles from "./HeroStage.module.css";

type P3 = { x: number; y: number; z: number; ring: number };

/** Build a point cloud: a sphere shell + a few tilted orbit rings. */
function buildPoints(): P3[] {
  const pts: P3[] = [];

  // Sphere shell via a Fibonacci lattice.
  const N = 460;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2; // 1 -> -1
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r, ring: 0 });
  }

  // Three orbit rings, each tilted on a different axis.
  const ringDefs = [
    { axis: "x" as const, tilt: 0.42, R: 1.32 },
    { axis: "y" as const, tilt: 1.15, R: 1.28 },
    { axis: "z" as const, tilt: 0.75, R: 1.36 },
  ];
  ringDefs.forEach((def, idx) => {
    const M = 96;
    for (let i = 0; i < M; i++) {
      const a = (i / M) * Math.PI * 2;
      let x = Math.cos(a) * def.R;
      let y = Math.sin(a) * def.R;
      let z = 0;
      const c = Math.cos(def.tilt);
      const s = Math.sin(def.tilt);
      if (def.axis === "x") {
        [y, z] = [y * c - z * s, y * s + z * c];
      } else if (def.axis === "y") {
        [x, z] = [x * c + z * s, -x * s + z * c];
      } else {
        [x, y] = [x * c - y * s, x * s + y * c];
      }
      pts.push({ x, y, z, ring: idx + 1 });
    }
  });

  return pts;
}

export const HeroStage: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const rot = useRef({ x: -0.35, y: 0, tx: -0.35, ty: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const pts = buildPoints();
    let size = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = Math.min(canvas.clientWidth, canvas.clientHeight);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    let raf = 0;
    let t = 0;

    const frame = () => {
      t += 0.004;
      rot.current.x += (rot.current.tx - rot.current.x) * 0.06;
      rot.current.y += (rot.current.ty - rot.current.y) * 0.06;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const R = size * 0.3;
      const focal = 3.2;

      const ry = rot.current.y + t; // continuous spin
      const rx = rot.current.x;
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);

      const projected = pts.map((p) => {
        // rotate Y then X
        let x = p.x * cosY + p.z * sinY;
        let z = -p.x * sinY + p.z * cosY;
        let y = p.y * cosX - z * sinX;
        z = p.y * sinX + z * cosX;
        const scale = focal / (focal + z);
        return {
          sx: cx + x * scale * R,
          sy: cy + y * scale * R,
          scale,
          z,
          ring: p.ring,
        };
      });

      projected.sort((a, b) => a.z - b.z);

      for (const p of projected) {
        const depth = (p.z + 1.6) / 3.2; // 0..1 far->near
        const alpha = 0.06 + depth * 0.82;
        const rad = p.ring === 0 ? 1.5 * p.scale : 1.9 * p.scale;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(0.4, rad), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(17,17,17,${alpha})`;
        ctx.fill();
      }

      if (!reduce) raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    if (reduce) {
      frame();
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Pointer parallax across the whole stage.
  const onMove = (e: React.PointerEvent) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2); // -1..1
    const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    rot.current.ty = nx * 0.6;
    rot.current.tx = -0.35 + ny * 0.4;
    if (layersRef.current) {
      layersRef.current.style.setProperty("--px", `${nx * 14}px`);
      layersRef.current.style.setProperty("--py", `${ny * 10}px`);
    }
  };

  const onLeave = () => {
    rot.current.tx = -0.35;
    rot.current.ty = 0;
    if (layersRef.current) {
      layersRef.current.style.setProperty("--px", "0px");
      layersRef.current.style.setProperty("--py", "0px");
    }
  };

  return (
    <div className={styles.stage} onPointerMove={onMove} onPointerLeave={onLeave}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
      <div ref={layersRef} className={styles.layers}>
        {children}
      </div>
    </div>
  );
};
