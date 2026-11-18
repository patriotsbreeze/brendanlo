"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { bedResolution, type BedId } from "../_tensors/beds.ts";
import { cellAtUV } from "../_tensors/core.ts";
import { regionAtUV, type Food } from "../_tensors/meal.ts";
import type { UVMapper } from "./BedCanvas.tsx";
import { useCapability, useReducedMotion } from "./capability.ts";
import { Poster, POSTER_PAD } from "./Poster.tsx";
import { lab, useLab, type Probe } from "./store.ts";
import { picksOf, restingTensor } from "./views.ts";
import styles from "./bed.module.css";

// ssr:false has to live in a client file (lazy-loading.md); this keeps three
// out of the server HTML and the initial bundle.
const BedCanvas = dynamic(() => import("./BedCanvas.tsx"), { ssr: false, loading: () => null });

const FOODS = new Set<Food>(["rice", "chicken", "broccoli"]);
/** A pointer that travels further than this between down and up was a drag
 * or a scroll, not a tap. */
const TAP_SLOP = 8;

interface Props {
  bed: BedId;
  /** Accessible name of the probe surface. */
  label: string;
  /** Readout shown when nothing is probed. */
  idle: string;
  /** Hero only: readout while an index row is previewed. */
  previewIdle?: Partial<Record<string, string>>;
}

export function Bed({ bed, label, idle, previewIdle }: Props) {
  const cap = useCapability();
  const reduced = useReducedMotion();
  const [near, setNear] = useState(false);
  const [playLoad, setPlayLoad] = useState(false);
  const [live, setLive] = useState(false);
  const [lost, setLost] = useState(false);
  // Announce readout changes for keyboard and taps, not for every mouse hover.
  const [announce, setAnnounce] = useState(true);
  const slotRef = useRef<HTMLDivElement>(null);
  const mapper = useRef<UVMapper>(null);
  const pressing = useRef(false);
  const down = useRef<{ id: number; x: number; y: number; touch: boolean } | null>(null);
  const readoutId = useId();

  // The grid the visitor is actually looking at: the live bed's tier, or the
  // poster (always the low tier).
  const [cols, rows] = live && cap?.ok ? bedResolution(bed, cap.tier) : bedResolution(bed, "low");

  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[entries.length - 1].isIntersecting) return;
        if (bed === "healthar") {
          // The load sequence plays once per session.
          let seen = false;
          try {
            seen = sessionStorage.getItem("lab:loaded") === "1";
            sessionStorage.setItem("lab:loaded", "1");
          } catch {
            seen = false;
          }
          setPlayLoad(!seen);
        }
        setNear(true);
        io.disconnect();
      },
      { rootMargin: "60% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [bed]);

  const onReady = useCallback(() => setLive(true), []);
  const onLost = useCallback(() => {
    setLost(true);
    setLive(false);
  }, []);
  const onMapper = useCallback((fn: UVMapper) => {
    mapper.current = fn;
  }, []);

  const uvAt = (clientX: number, clientY: number) => {
    if (mapper.current) return mapper.current(clientX, clientY);
    const svg = slotRef.current?.querySelector("svg");
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const s = Math.min(r.width / vb.width, r.height / vb.height);
    const ox = r.left + (r.width - vb.width * s) / 2;
    const oy = r.top + (r.height - vb.height * s) / 2;
    const w = vb.width - POSTER_PAD * 2;
    const h = vb.height - POSTER_PAD * 2;
    const u = ((clientX - ox) / s - POSTER_PAD) / w;
    const v = ((clientY - oy) / s - POSTER_PAD) / h;
    return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { u, v } : null;
  };

  /** A completed press: read the pin, and on the meal bed pick the food. */
  const commit = (p: Probe) => {
    lab.setProbe(bed, p);
    if (bed === "meal") {
      const region = regionAtUV(p.u, p.v);
      if (FOODS.has(region as Food)) lab.set({ meal: { food: region as Food } });
    }
  };

  const release = () => {
    pressing.current = false;
    const p = lab.get().probe[bed];
    if (p?.pressed) lab.setProbe(bed, { ...p, pressed: false });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Primary button only; a right/ctrl-click opens a context menu that eats
    // the pointerup.
    if (e.button !== 0 || (e.pointerType === "mouse" && e.ctrlKey)) return;
    setAnnounce(true);
    down.current = { id: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType === "touch" };
    // Touch waits for pointerup: the gesture may still turn into a scroll.
    if (e.pointerType === "touch") return;
    pressing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const uv = uvAt(e.clientX, e.clientY);
    if (uv) lab.setProbe(bed, { ...uv, pressed: true });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = down.current;
    if (d?.touch) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_SLOP) down.current = null;
      return;
    }
    if (e.pointerType !== "mouse" && !pressing.current) return;
    if (!pressing.current && announce) setAnnounce(false);
    const uv = uvAt(e.clientX, e.clientY);
    lab.setProbe(bed, uv ? { ...uv, pressed: pressing.current } : null);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    const tap = d && d.id === e.pointerId && Math.hypot(e.clientX - d.x, e.clientY - d.y) <= TAP_SLOP;
    if (tap) {
      const uv = uvAt(e.clientX, e.clientY);
      if (uv) commit({ ...uv, pressed: false });
    }
    release();
  };

  const onPointerCancel = () => {
    if (down.current?.touch) lab.setProbe(bed, null);
    down.current = null;
    release();
  };

  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && !pressing.current) lab.setProbe(bed, null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    setAnnounce(true);
    const p = lab.get().probe[bed] ?? { u: 0.5, v: 0.5, pressed: false };
    const step = (du: number, dv: number) => {
      e.preventDefault();
      lab.setProbe(bed, {
        u: Math.min(1 - 0.5 / cols, Math.max(0.5 / cols, p.u + du / cols)),
        v: Math.min(1 - 0.5 / rows, Math.max(0.5 / rows, p.v + dv / rows)),
        pressed: false,
      });
    };
    switch (e.key) {
      case "ArrowLeft":
        return step(-1, 0);
      case "ArrowRight":
        return step(1, 0);
      case "ArrowUp":
        return step(0, -1);
      case "ArrowDown":
        return step(0, 1);
      case "Enter":
      case " ":
        e.preventDefault();
        if (!e.repeat) commit({ ...p, pressed: true });
        return;
      case "Escape":
        return lab.setProbe(bed, null);
    }
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") release();
  };
  // Assistive tech "activate" (outside focus mode) arrives as a click with no
  // pointer behind it: press the current cell, or the centre.
  const onClick = (e: React.MouseEvent) => {
    if (e.detail !== 0) return;
    setAnnounce(true);
    const p = lab.get().probe[bed] ?? { u: 0.5, v: 0.5, pressed: false };
    commit({ ...p, pressed: false });
  };

  const state = useLab((s) => s);
  const probe = state.probe[bed];
  const readout = useMemo(() => {
    const picks = picksOf(state);
    const fallback = (picks.preview && previewIdle?.[picks.preview]) || (picks.swag && previewIdle?.swag) || idle;
    if (!probe) return fallback;
    const t = restingTensor(bed, cols, rows, picks);
    return t.describe(cellAtUV(probe.u, probe.v, t.cols, t.rows)) || fallback;
  }, [state, probe, bed, idle, previewIdle, cols, rows]);

  return (
    <div className={styles.bed}>
      <div
        ref={slotRef}
        className={styles.slot}
        data-live={live ? "" : undefined}
        tabIndex={0}
        role="application"
        aria-roledescription="pin probe"
        aria-label={`${label} arrow keys move the probe, enter presses.`}
        aria-describedby={readoutId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={release}
        onPointerLeave={onPointerLeave}
        onContextMenu={release}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={release}
        onClick={onClick}
      >
        <Poster bed={bed} />
        {cap?.ok && near && !lost ? (
          <BedCanvas
            bed={bed}
            tier={cap.tier}
            reduced={reduced}
            playLoad={playLoad}
            onReady={onReady}
            onLost={onLost}
            onMapper={onMapper}
          />
        ) : null}
      </div>
      <p className={styles.readout}>
        <output id={readoutId} aria-live={announce ? "polite" : "off"}>
          {readout}
        </output>
      </p>
    </div>
  );
}
