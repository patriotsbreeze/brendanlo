"use client";

import React, { useRef } from "react";
import styles from "./TiltCard.module.css";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Max tilt in degrees. */
  max?: number;
  /** Border radius in px (match the wrapped card). */
  radius?: number;
}

/**
 * Wraps a card in a cursor-tracked spotlight + subtle 3D tilt.
 * The spotlight rides a CSS radial-gradient driven by --mx / --my,
 * masked to the border for a "lit edge" that follows the pointer.
 */
export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = "",
  max = 7,
  radius = 20,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const rx = (py / rect.height - 0.5) * -2 * max;
    const ry = (px / rect.width - 0.5) * 2 * max;

    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--mx", `${px}px`);
      el.style.setProperty("--my", `${py}px`);
      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
      el.style.setProperty("--op", "1");
    });
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--op", "0");
  };

  return (
    <div
      ref={ref}
      className={`${styles.tilt} ${className}`}
      style={{ borderRadius: radius }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className={styles.inner}>{children}</div>
      <span className={styles.spotlight} aria-hidden />
      <span className={styles.sheen} aria-hidden />
    </div>
  );
};
