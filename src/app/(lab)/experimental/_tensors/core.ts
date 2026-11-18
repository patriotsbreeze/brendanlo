/* Shared primitives for every bed's tensor. Pure, deterministic, and free of
 * three/React so the same functions feed the server SVG poster, the WebGL pin
 * bed, the DOM readouts, and scripts/verify-tensors.mts.
 *
 * Conventions:
 * - A tensor is a cols x rows grid of pins, row-major. Row 0 is the BACK of the
 *   bed (far from the camera), row rows-1 is the front.
 * - h is pin height in 0..1 (the renderer scales it), dye is per-pin paint.
 * - (u, v) are cell-centre coordinates in 0..1; (x, z) are "physical" bed
 *   coordinates with the bed's aspect baked in: x in [-a/2, a/2], z in
 *   [-1/2, 1/2], a = cols/rows. */

export const DYE_NONE = 0;
export const DYE_MODEL = 1; // yellow: what a model said
export const DYE_CHECK = 2; // green: what something deterministic checked
export type Dye = typeof DYE_NONE | typeof DYE_MODEL | typeof DYE_CHECK;

export interface Tensor {
  cols: number;
  rows: number;
  h: Float32Array;
  dye: Uint8Array;
  /** Plain-language reading for a pin, for the DOM probe readout. */
  describe: (index: number) => string;
}

export function blank(cols: number, rows: number): Tensor {
  return {
    cols,
    rows,
    h: new Float32Array(cols * rows),
    dye: new Uint8Array(cols * rows),
    describe: () => "",
  };
}

export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** Cell centre in physical bed coordinates. */
export function cellXZ(col: number, row: number, cols: number, rows: number) {
  const aspect = cols / rows;
  return {
    x: ((col + 0.5) / cols - 0.5) * aspect,
    z: (row + 0.5) / rows - 0.5,
  };
}

/** Nearest cell index for a (u, v) in 0..1. */
export function cellAtUV(u: number, v: number, cols: number, rows: number) {
  const c = Math.min(cols - 1, Math.max(0, Math.floor(u * cols)));
  const r = Math.min(rows - 1, Math.max(0, Math.floor(v * rows)));
  return r * cols + c;
}

/** mulberry32: tiny seeded PRNG, so tensors are identical on server, client
 * and in StrictMode double renders. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer hash -> [0, 1). Stateless, so it can be sampled per cell. */
export function hash2(x: number, y: number, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1). */
export function valueNoise(x: number, y: number, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return mix(mix(a, b, sx), mix(c, d, sx), sy);
}

/** Ellipsoid cap: 0 outside, dome of height `top` inside. */
export function ellipsoid(x: number, z: number, cx: number, cz: number, rx: number, rz: number, top: number) {
  const dx = (x - cx) / rx;
  const dz = (z - cz) / rz;
  const s = 1 - dx * dx - dz * dz;
  return s > 0 ? top * Math.sqrt(s) : 0;
}

/** Superellipse slab with a domed top (n = 4 gives a rounded box). */
export function slab(x: number, z: number, cx: number, cz: number, ax: number, az: number, top: number, n = 4, dome = 0.35) {
  const s = Math.pow(Math.abs(x - cx) / ax, n) + Math.pow(Math.abs(z - cz) / az, n);
  return s < 1 ? top * Math.pow(1 - s, dome) : 0;
}

/** Capsule (segment with radius) as a rounded ridge of height `top`. */
export function capsule(x: number, z: number, x0: number, z0: number, x1: number, z1: number, r: number, top: number) {
  const vx = x1 - x0;
  const vz = z1 - z0;
  const t = clamp(((x - x0) * vx + (z - z0) * vz) / (vx * vx + vz * vz));
  const dx = x - (x0 + vx * t);
  const dz = z - (z0 + vz * t);
  const d2 = (dx * dx + dz * dz) / (r * r);
  return d2 < 1 ? top * Math.sqrt(1 - d2) : 0;
}

export const pad = (n: number) => String(n);
