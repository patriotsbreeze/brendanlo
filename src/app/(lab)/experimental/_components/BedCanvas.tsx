"use client";

import { useEffect, useRef } from "react";
import type { BedId, Tier } from "../_tensors/beds.ts";
import { lab } from "./store.ts";
import { PinBed } from "./stage/pinBed.ts";
import styles from "./bed.module.css";

/* The only module that imports three. Bed.tsx loads it with
 * next/dynamic({ ssr: false }) after the idle capability probe, so three never
 * enters the server HTML or the initial bundle. */

export type UVMapper = ((x: number, y: number) => { u: number; v: number } | null) | null;

interface Props {
  bed: BedId;
  tier: Tier;
  reduced: boolean;
  playLoad: boolean;
  onReady: () => void;
  onLost: () => void;
  onMapper: (fn: UVMapper) => void;
}

export default function BedCanvas({ bed, tier, reduced, playLoad, onReady, onLost, onMapper }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    // A fresh <canvas> per effect run: dispose() force-loses the context, and a
    // canvas whose context was lost can never hand out a new one (StrictMode
    // runs this effect twice in development).
    const canvas = document.createElement("canvas");
    canvas.className = styles.canvasEl;
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    let pin: PinBed;
    try {
      pin = new PinBed(canvas, { bed, tier, reduced, playLoad, onFirstFrame: onReady, onLost });
    } catch {
      canvas.remove();
      onLost();
      return;
    }
    onMapper((x, y) => pin.pointerToUV(x, y));
    const unsubscribe = lab.subscribe(pin.onStore);
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      pin.resize(r.width, r.height);
    });
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => pin.setVisible(entries[entries.length - 1].isIntersecting), { rootMargin: "120px 0px" });
    io.observe(canvas);
    const onVisibility = () => {
      if (document.visibilityState === "visible") pin.invalidate();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      unsubscribe();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      onMapper(null);
      pin.dispose();
      canvas.remove();
    };
  }, [bed, tier, reduced, playLoad, onReady, onLost, onMapper]);

  return <div ref={ref} className={styles.canvas} aria-hidden="true" />;
}
