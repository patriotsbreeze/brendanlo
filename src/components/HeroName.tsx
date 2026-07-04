"use client";

import React, { useRef } from "react";
import styles from "./HeroName.module.css";

interface HeroNameProps {
  text: string;
  className?: string;
}

/**
 * Big hero title: each letter masks up on load (staggered), a light sheen
 * sweeps across, and letters lift toward the cursor for a magnetic feel.
 */
export const HeroName: React.FC<HeroNameProps> = ({ text, className = "" }) => {
  const wrapRef = useRef<HTMLHeadingElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const letters = wrap.querySelectorAll<HTMLElement>(`.${styles.letter}`);
    letters.forEach((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const R = 130;
      if (dist < R) {
        const f = (1 - dist / R) * 14;
        const ang = Math.atan2(dy, dx);
        el.style.transform = `translate(${-Math.cos(ang) * f}px, ${
          -Math.sin(ang) * f
        }px)`;
      } else {
        el.style.transform = "";
      }
    });
  };

  const onLeave = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap
      .querySelectorAll<HTMLElement>(`.${styles.letter}`)
      .forEach((el) => (el.style.transform = ""));
  };

  const chars = Array.from(text);

  return (
    <h1
      ref={wrapRef}
      className={`${styles.name} ${className}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      aria-label={text}
    >
      {chars.map((ch, i) => (
        <span key={i} className={styles.mask} aria-hidden>
          <span
            className={styles.letter}
            style={{ ["--d" as string]: `${0.25 + i * 0.05}s` } as React.CSSProperties}
          >
            {ch === " " ? " " : ch}
          </span>
        </span>
      ))}
    </h1>
  );
};
