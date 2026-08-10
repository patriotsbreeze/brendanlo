"use client";

import React from "react";
import styles from "./HeroName.module.css";

interface HeroNameProps {
  text: string;
  className?: string;
}

/**
 * The name masks up on load, once, and then holds still. The previous version
 * also ran an infinite background-position sheen and a magnetic cursor
 * repulsion that called getBoundingClientRect() on every letter per unthrottled
 * pointermove — ten forced layouts per mouse move on the hero. The WebGL is
 * the hero's visual event; the name should be still and confident beside it.
 */
export const HeroName: React.FC<HeroNameProps> = ({ text, className = "" }) => {
  const chars = Array.from(text);

  return (
    <h1 className={`${styles.name} ${className}`} aria-label={text}>
      {chars.map((ch, i) => (
        <span key={i} className={styles.mask} aria-hidden>
          <span
            className={styles.letter}
            style={{ ["--d" as string]: `${0.12 + i * 0.035}s` } as React.CSSProperties}
          >
            {ch === " " ? " " : ch}
          </span>
        </span>
      ))}
    </h1>
  );
};
