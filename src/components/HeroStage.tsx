"use client";

import React, { useEffect, useRef } from "react";
import styles from "./HeroStage.module.css";

type V3 = { x: number; y: number; z: number };
type Label = V3 & { text: string; tier: number };

/* Rings of things that make up Brendan's world — languages, the stack he
 * ships with, and the research he does — literally orbiting his name. */
const RINGS = [
  {
    R: 0.98,
    axis: "x" as const,
    tilt: 0.5,
    labels: ["Python", "TypeScript", "C++", "Java", "R"],
  },
  {
    R: 1.3,
    axis: "y" as const,
    tilt: 1.12,
    labels: ["Next.js", "React", "Node.js", "Supabase", "SQL", "Docker"],
  },
  {
    R: 1.62,
    axis: "z" as const,
    tilt: 0.72,
    labels: [
      "Machine Learning",
      "Agentic AI",
      "Random Forest",
      "RNA-seq",
      "Data Analysis",
    ],
  },
  {
    R: 1.94,
    axis: "x" as const,
    tilt: -0.42,
    labels: ["Drug Discovery", "Molecular Dynamics", "Cell Biology", "ICML"],
  },
];

const tiltPoint = (
  a: number,
  R: number,
  axis: "x" | "y" | "z",
  tilt: number
): V3 => {
  let x = Math.cos(a) * R;
  let y = Math.sin(a) * R;
  let z = 0;
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  if (axis === "x") [y, z] = [y * c - z * s, y * s + z * c];
  else if (axis === "y") [x, z] = [x * c + z * s, -x * s + z * c];
  else [x, y] = [x * c - y * s, x * s + y * c];
  return { x, y, z };
};

function buildOrbits() {
  const pathDots: (V3 & { tier: number })[] = [];
  const labels: Label[] = [];
  RINGS.forEach((ring, tier) => {
    const DOTS = 74;
    for (let i = 0; i < DOTS; i++) {
      const a = (i / DOTS) * Math.PI * 2;
      pathDots.push({ ...tiltPoint(a, ring.R, ring.axis, ring.tilt), tier });
    }
    ring.labels.forEach((text, i) => {
      const a = (i / ring.labels.length) * Math.PI * 2;
      labels.push({ ...tiltPoint(a, ring.R, ring.axis, ring.tilt), text, tier });
    });
  });
  return { pathDots, labels };
}

export const HeroStage: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const rot = useRef({ x: -0.32, y: 0, tx: -0.32, ty: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const { pathDots, labels } = buildOrbits();
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
    const focal = 3.4;

    const project = (p: V3, cx: number, cy: number, R: number, m: number[]) => {
      // m = [cosY, sinY, cosX, sinX]
      const [cosY, sinY, cosX, sinX] = m;
      let x = p.x * cosY + p.z * sinY;
      let z = -p.x * sinY + p.z * cosY;
      const y = p.y * cosX - z * sinX;
      z = p.y * sinX + z * cosX;
      const scale = focal / (focal + z);
      return { sx: cx + x * scale * R, sy: cy + y * scale * R, scale, z };
    };

    const frame = () => {
      t += 0.0033;
      rot.current.x += (rot.current.tx - rot.current.x) * 0.06;
      rot.current.y += (rot.current.ty - rot.current.y) * 0.06;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const R = size * 0.17;
      ctx.clearRect(0, 0, w, h);

      const ry = rot.current.y + t;
      const rx = rot.current.x;
      const m = [Math.cos(ry), Math.sin(ry), Math.cos(rx), Math.sin(rx)];

      // Elliptical clear zone over the name (fade anything crossing it).
      const exW = w * 0.46;
      const exH = h * 0.17;
      const nameFade = (sx: number, sy: number) => {
        const dx = (sx - cx) / exW;
        const dy = (sy - cy) / exH;
        const d = Math.sqrt(dx * dx + dy * dy);
        return Math.min(1, Math.max(0, (d - 0.72) / 0.4));
      };

      // Orbit path dots.
      for (const p of pathDots) {
        const pr = project(p, cx, cy, R, m);
        const depth = Math.min(1, Math.max(0, (1.9 - pr.z) / 3.8));
        const a = 0.05 + depth * 0.16;
        const fade = nameFade(pr.sx, pr.sy);
        if (fade <= 0.01) continue;
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, Math.max(0.4, 1.1 * pr.scale), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(17,17,17,${a * fade})`;
        ctx.fill();
      }

      // Labels, drawn back-to-front.
      const projLabels = labels
        .map((l) => ({ l, pr: project(l, cx, cy, R, m) }))
        .sort((a, b) => b.pr.z - a.pr.z);

      for (const { l, pr } of projLabels) {
        const depth = Math.min(1, Math.max(0, (1.9 - pr.z) / 3.8));
        const fade = nameFade(pr.sx, pr.sy);
        if (fade <= 0.01) continue;
        const alpha = (0.1 + depth * depth * 0.85) * fade;
        const fs = Math.max(8, 13.5 * pr.scale);

        ctx.font = `700 ${fs}px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // node dot
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy - fs * 0.95, Math.max(0.8, 1.8 * pr.scale), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(17,17,17,${alpha})`;
        ctx.fill();

        ctx.fillStyle = `rgba(17,17,17,${alpha})`;
        ctx.fillText(l.text, pr.sx, pr.sy + fs * 0.3);
      }

      if (!reduce) raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    if (reduce) frame();
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const onMove = (e: React.PointerEvent) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    rot.current.ty = nx * 0.6;
    rot.current.tx = -0.32 + ny * 0.4;
    if (layersRef.current) {
      layersRef.current.style.setProperty("--px", `${nx * 14}px`);
      layersRef.current.style.setProperty("--py", `${ny * 10}px`);
    }
  };

  const onLeave = () => {
    rot.current.tx = -0.32;
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
