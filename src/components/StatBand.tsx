"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./StatBand.module.css";

interface Stat {
  value: number;
  suffix?: string;
  label: string;
}

const STATS: Stat[] = [
  { value: 1000, suffix: "+", label: "Students reached" },
  { value: 20, suffix: "+", label: "Websites shipped" },
  { value: 7000, suffix: "+", label: "Community followers" },
  { value: 4, suffix: "", label: "Publications" },
];

const format = (n: number) => n.toLocaleString("en-US");

const Counter: React.FC<{ stat: Stat; go: boolean; delay: number }> = ({
  stat,
  go,
  delay,
}) => {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!go) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(stat.value);
      return;
    }
    let raf = 0;
    let start = 0;
    const dur = 1400;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      if (now < t0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (!start) start = now;
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(stat.value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [go, stat.value, delay]);

  return (
    <div className={styles.stat}>
      <div className={styles.value}>
        {format(n)}
        <span className={styles.suffix}>{stat.suffix}</span>
      </div>
      <div className={styles.label}>{stat.label}</div>
    </div>
  );
};

export const StatBand: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setGo(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.band}>
      {STATS.map((s, i) => (
        <Counter key={s.label} stat={s} go={go} delay={i * 140} />
      ))}
    </div>
  );
};
