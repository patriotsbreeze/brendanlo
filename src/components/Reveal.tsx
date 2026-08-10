"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./Reveal.module.css";

/* Two primitives, not five. `rise` moves content 12px; `rule` draws a hairline
 * left-to-right. Everything on the page is one or the other. */
type Direction = "rise" | "rule";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  direction?: Direction;
  /** Stagger position. Multiplies --stagger, capped so a chain never exceeds 5 steps. */
  index?: number;
  /** Above-the-fold content: render shown on the server so it is never blank. */
  immediate?: boolean;
}

const MAX_STAGGER_STEPS = 5;

export const Reveal: React.FC<RevealProps> = ({
  children,
  className = "",
  direction = "rise",
  index = 0,
  immediate = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  // Above-fold content starts shown, so it is visible in the SSR HTML rather
  // than sitting at opacity 0 until hydration and the observer both land.
  const [shown, setShown] = useState(immediate);

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;
    // Reduced motion is handled entirely in CSS, so there is no synchronous
    // setState here and the observer stays the only path that flips state.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [immediate]);

  const step = Math.min(index, MAX_STAGGER_STEPS);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${styles[direction]} ${
        shown ? styles.shown : ""
      } ${className}`}
      style={step ? { transitionDelay: `calc(var(--stagger) * ${step})` } : undefined}
    >
      {children}
    </div>
  );
};
