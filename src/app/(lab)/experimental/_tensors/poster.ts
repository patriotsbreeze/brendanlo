import { DYE_CHECK, DYE_MODEL, type Tensor } from "./core.ts";

/* Top-down SVG of a pin bed, drawn from the same tensor as the WebGL bed and
 * lit from the same direction (key light from the back-left, 24 degrees up).
 * It is the pre-JS image, the no-WebGL fallback, and what controls redraw
 * when there is no canvas. Pins of the same tone share one <path>, so a
 * 32 x 24 poster is a handful of elements instead of 768. */

export interface PosterLayer {
  fill: string;
  d: string;
}
export interface Poster {
  width: number;
  height: number;
  layers: PosterLayer[];
}

const TONES = ["#8f958f", "#a2a8a1", "#b3b8b2", "#c3c8c2", "#d2d6d0", "#dfe2dd", "#eceee9"];
const DYE_TONES: Record<number, [string, string]> = {
  [DYE_MODEL]: ["#d4b200", "#ffd60a"],
  [DYE_CHECK]: ["#00783c", "#00a050"],
};
const SLOPE = Math.tan((24 * Math.PI) / 180) * Math.SQRT2; // light rise per diagonal step

export function posterOf(t: Tensor, scale: number): Poster {
  const { cols, rows } = t;
  const S = 10;
  const buckets = new Map<string, string[]>();
  const add = (fill: string, d: string) => {
    const b = buckets.get(fill);
    if (b) b.push(d);
    else buckets.set(fill, [d]);
  };
  let maxH = 1e-6;
  for (let i = 0; i < t.h.length; i++) maxH = Math.max(maxH, t.h[i]);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const H = t.h[i] * scale;
      // Cast shadow: march toward the light (up and to the left in the grid).
      let lit = 1;
      for (let k = 1; k <= 10; k++) {
        const cc = c - k;
        const rr = r - k;
        if (cc < 0 || rr < 0) break;
        if (t.h[rr * cols + cc] * scale > H + k * SLOPE) {
          lit = 0;
          break;
        }
      }
      const d = `M${c * S + 1} ${r * S + 1}h8v8h-8z`;
      const dye = t.dye[i];
      if (dye && DYE_TONES[dye]) {
        add(DYE_TONES[dye][lit], d);
        continue;
      }
      const tone = Math.round((0.35 + 0.65 * (t.h[i] / maxH)) * (lit ? 1 : 0.55) * (TONES.length - 1));
      add(TONES[Math.max(0, Math.min(TONES.length - 1, tone))], d);
    }
  }
  return {
    width: cols * S,
    height: rows * S,
    layers: [...buckets.entries()].map(([fill, ds]) => ({ fill, d: ds.join("") })),
  };
}
