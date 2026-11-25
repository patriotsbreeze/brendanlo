"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { dayToMs, type Run } from "../_lib/runs";

/* The few parts both charts share: measured width, round ticks, a crosshair
 * that snaps to the nearest item (pointer or arrow keys), and a tooltip. */

export const PAD = { top: 18, right: 14, bottom: 24, left: 34 } as const;

/** Width of the element the ref lands on. 0 until measured. */
export function useWidth() {
  const [width, setWidth] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    // Measured now as well, so the first paint already has the chart in it.
    setWidth(Math.round(el.getBoundingClientRect().width));
    observer.current = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.current.observe(el);
  }, []);
  return [ref, width] as const;
}

/** Round, evenly spaced ticks inside [lo, hi]. */
export function ticks(lo: number, hi: number, count: number): number[] {
  const raw = Math.max(1, (hi - lo) / Math.max(1, count));
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v));
  return out;
}

/** Same score axis for every chart on the page. Not from zero: these are
 * positions, not lengths, and the story is a few points of movement. */
export function scoreDomain(runs: readonly Run[]): [number, number] {
  const scores = runs.map((r) => r.score);
  const lo = Math.max(0, Math.floor((Math.min(...scores) - 2) / 10) * 10);
  const hi = Math.ceil((Math.max(...scores) + 2) / 10) * 10;
  return [lo, Math.max(hi, lo + 20)];
}

/** Index under the pointer, or moved to with the arrow keys. */
export function useCursor(count: number, nearest: (x: number) => number) {
  const [index, setIndex] = useState<number | null>(null);
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  const handlers = {
    tabIndex: 0,
    onPointerMove: (e: PointerEvent<SVGSVGElement>) =>
      setIndex(nearest(e.clientX - e.currentTarget.getBoundingClientRect().left)),
    onPointerDown: (e: PointerEvent<SVGSVGElement>) =>
      setIndex(nearest(e.clientX - e.currentTarget.getBoundingClientRect().left)),
    onPointerLeave: (e: PointerEvent<SVGSVGElement>) => {
      // A tap should leave its reading up; a mouse leaving should not.
      if (e.pointerType === "mouse") setIndex(null);
    },
    onFocus: () => setIndex((i) => i ?? count - 1),
    onBlur: () => setIndex(null),
    onKeyDown: (e: KeyboardEvent<SVGSVGElement>) => {
      const move = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }[e.key];
      if (move !== undefined) {
        e.preventDefault();
        setIndex((i) => clamp((i ?? count - 1) + move));
      } else if (e.key === "Escape") setIndex(null);
    },
  };
  return [index === null || index >= count ? null : index, handlers] as const;
}

export function nearestIndex(xs: readonly number[], x: number): number {
  let best = 0;
  for (let i = 1; i < xs.length; i++) {
    if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i;
  }
  return best;
}

export function Tooltip({
  x,
  width,
  title,
  rows,
}: {
  x: number;
  width: number;
  title: string;
  rows: readonly { key?: "try" | "best" | "mean" | "excluded"; value: string; label: string }[];
}) {
  const right = x > width / 2;
  return (
    <div
      className="tooltip"
      role="status"
      style={right ? { right: width - x + 12 } : { left: x + 12 }}
    >
      <p>{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="tooltipRow">
          <span className={r.key ? `key ${r.key}` : "key"} aria-hidden="true" />
          <b>{r.value}</b> {r.label}
        </p>
      ))}
    </div>
  );
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** "nov 25" */
export function shortDay(day: string | number): string {
  const d = new Date(typeof day === "number" ? day : dayToMs(day));
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "wed, nov 25, 2026" */
export function longDay(day: string): string {
  const d = new Date(dayToMs(day));
  return `${WEEKDAYS[d.getUTCDay()]}, ${shortDay(day)}, ${d.getUTCFullYear()}`;
}

export const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase();
