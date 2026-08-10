/**
 * Proves the filtration maths rather than eyeballing it.
 *
 *   node --experimental-strip-types scripts/verify-filtration.mts
 *
 * Exits non-zero on any failure. Two of these assertions are contracts the
 * shaders depend on:
 *
 *   - H0 exactness backs the number printed in the figure's readout.
 *   - The ball identity backs the point shader's `distance(p, uHoverPos) <=
 *     uEpsilon * uMaxLen` test. If it ever breaks, the hover ball is a lie.
 */

import {
  buildCloud,
  buildEdges,
  h0Barcode,
  componentsAt,
  type Cloud,
  type Edges,
} from "../src/components/hero/filtration.ts";
import { pickNearest } from "../src/components/hero/picking.ts";
import { epsilonCurve } from "../src/components/hero/epsilonCurve.ts";

const EPS = [0, 0.2, 0.42, 0.6, 0.72, 0.86, 1.0];
const N = 2400;
const E = 15000;

let failures = 0;
const ok = (label: string, pass: boolean, detail = "") => {
  if (!pass) failures++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
};

/* ── helpers ─────────────────────────────────────────────────────────────── */

function dist(p: Float32Array, i: number, j: number): number {
  const dx = p[i * 3] - p[j * 3];
  const dy = p[i * 3 + 1] - p[j * 3 + 1];
  const dz = p[i * 3 + 2] - p[j * 3 + 2];
  return Math.hypot(dx, dy, dz);
}

/** Brute-force connected components over {edges : birth <= eps}. */
function trueComponents(edges: Edges, n: number, eps: number): number {
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  for (let e = 0; e < edges.count; e++) {
    if (edges.lengths[e] > eps) break;
    const a = find(edges.pairs[e * 2]);
    const b = find(edges.pairs[e * 2 + 1]);
    if (a !== b) parent[a] = b;
  }
  const roots = new Set<number>();
  for (let i = 0; i < n; i++) roots.add(find(i));
  return roots.size;
}

/** Principal-component standard deviations of the projected R^3 cloud. */
function pcaSd(cloud: Cloud): { sd: number[]; centroid: number[] } {
  const { positions: p, count: n } = cloud;
  const c = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    c[0] += p[i * 3];
    c[1] += p[i * 3 + 1];
    c[2] += p[i * 3 + 2];
  }
  c[0] /= n;
  c[1] /= n;
  c[2] /= n;

  const M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < n; i++) {
    const v = [p[i * 3] - c[0], p[i * 3 + 1] - c[1], p[i * 3 + 2] - c[2]];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) M[a][b] += v[a] * v[b];
  }
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) M[a][b] /= n;

  // Power iteration with deflation — 3x3, so this is exact enough and has no deps.
  const A = M.map((r) => r.slice());
  const eig: number[] = [];
  for (let k = 0; k < 3; k++) {
    let v = [0.5772, 0.3141, 0.7182];
    for (let it = 0; it < 600; it++) {
      const w = [0, 0, 0];
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) w[a] += A[a][b] * v[b];
      const nrm = Math.hypot(w[0], w[1], w[2]) || 1;
      v = w.map((x) => x / nrm);
    }
    const w = [0, 0, 0];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) w[a] += A[a][b] * v[b];
    const lam = v.reduce((s, x, i) => s + x * w[i], 0);
    eig.push(lam);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) A[a][b] -= lam * v[a] * v[b];
  }
  return { sd: eig.map((e) => Math.sqrt(Math.max(0, e))), centroid: c };
}

/* ── run ─────────────────────────────────────────────────────────────────── */

console.log(`\nfiltration verification — ${N} points / ${E} edges\n`);

let t = Date.now();
const cloud = buildCloud(N);
const tCloud = Date.now() - t;
t = Date.now();
const edges = buildEdges(cloud, E);
const tEdges = Date.now() - t;
t = Date.now();
const deaths = h0Barcode(edges, N);
const tH0 = Date.now() - t;

console.log(`build: cloud ${tCloud}ms · edges ${tEdges}ms · h0 ${tH0}ms · kept ${edges.count} edges\n`);

/* 1 — H0 exactness. Backs the number in the readout. */
console.log("H0 exactness (union-find vs brute-force components)");
for (const eps of EPS) {
  const a = componentsAt(deaths, N, eps);
  const b = trueComponents(edges, N, eps);
  ok(`eps=${eps.toFixed(2).padStart(4)}`, a === b, `H0=${a} brute=${b}`);
}

/* 2 — Ball identity. Backs the point shader's distance test. */
console.log("\nball identity  {j : ||xi-xj|| <= eps*maxLen} == {j : edge(i,j), birth <= eps}");
const maxLen = edges.maxLen;
const adj = new Map<number, { j: number; b: number }[]>();
for (let e = 0; e < edges.count; e++) {
  const i = edges.pairs[e * 2];
  const j = edges.pairs[e * 2 + 1];
  const b = edges.lengths[e];
  (adj.get(i) ?? adj.set(i, []).get(i)!).push({ j, b });
  (adj.get(j) ?? adj.set(j, []).get(j)!).push({ j: i, b });
}
let mismatches = 0;
let samples = 0;
let ballTotal = 0;
for (const eps of EPS) {
  for (let s = 0; s < 60; s++) {
    const i = (s * 37) % N;
    const fromEdges = new Set((adj.get(i) ?? []).filter((x) => x.b <= eps).map((x) => x.j));
    const fromDist = new Set<number>();
    for (let j = 0; j < N; j++) {
      if (j !== i && dist(cloud.positions, i, j) <= eps * maxLen) fromDist.add(j);
    }
    samples++;
    ballTotal += fromDist.size;
    if (
      fromEdges.size !== fromDist.size ||
      [...fromDist].some((j) => !fromEdges.has(j))
    ) {
      mismatches++;
    }
  }
}
ok(
  `${samples} samples`,
  mismatches === 0,
  `mismatches=${mismatches} mean|B|=${(ballTotal / samples).toFixed(2)}`
);

/* 3 — maxLen round-trip. The shader scales the ball by this; it must be data. */
console.log("\nmaxLen round-trip");
let trueMax = 0;
for (let e = 0; e < edges.count; e++) {
  const d = dist(cloud.positions, edges.pairs[e * 2], edges.pairs[e * 2 + 1]);
  if (d > trueMax) trueMax = d;
}
ok("maxLen == max kept edge length", Math.abs(maxLen - trueMax) < 1e-6, `${maxLen.toFixed(6)}`);
let birthErr = 0;
for (let e = 0; e < edges.count; e++) {
  const d = dist(cloud.positions, edges.pairs[e * 2], edges.pairs[e * 2 + 1]);
  birthErr = Math.max(birthErr, Math.abs(edges.lengths[e] - d / maxLen));
}
ok("births == len/maxLen", birthErr < 1e-6, `maxerr=${birthErr.toExponential(2)}`);
let sorted = true;
for (let e = 1; e < edges.count; e++) if (edges.lengths[e] < edges.lengths[e - 1]) sorted = false;
ok("births ascending", sorted);

/* 4 — Geometry invariants. The camera framing and the reference box assume these. */
console.log("\ngeometry invariants");
const { sd, centroid } = pcaSd(cloud);
const flatness = sd[2] / sd[0];
let radius = 0;
let maxAbs = 0;
for (let i = 0; i < N; i++) {
  const x = cloud.positions[i * 3];
  const y = cloud.positions[i * 3 + 1];
  const z = cloud.positions[i * 3 + 2];
  radius = Math.max(radius, Math.hypot(x, y, z));
  maxAbs = Math.max(maxAbs, Math.abs(x), Math.abs(y), Math.abs(z));
}
console.log(`  PCA sd ${sd.map((s) => s.toFixed(4)).join(" / ")}`);
console.log(`  centroid (${centroid.map((c) => c.toFixed(4)).join(", ")})`);
ok("flatness >= 0.28", flatness >= 0.28, `flatness=${flatness.toFixed(4)}`);
ok("bounding radius == 1.0", Math.abs(radius - 1) < 1e-6, `r=${radius.toFixed(6)}`);
ok(
  "centroid == origin",
  Math.hypot(centroid[0], centroid[1], centroid[2]) < 1e-6,
  `|c|=${Math.hypot(centroid[0], centroid[1], centroid[2]).toExponential(2)}`
);
ok("max|coord| < 1.15 (fits the reference box)", maxAbs < 1.15, `max=${maxAbs.toFixed(4)}`);

/* 5 — Birth quantiles, printed so epsilonCurve can never silently go out of tune. */
console.log("\nbirth quantiles (epsilonCurve is tuned against these)");
for (const q of [0.1, 0.25, 0.5, 0.75, 0.9]) {
  const idx = Math.min(edges.count - 1, Math.floor(q * edges.count));
  console.log(`  p${String(q * 100).padStart(3)}  ${edges.lengths[idx].toFixed(4)}`);
}
console.log("\nH0 / edges alive by eps");
for (const eps of EPS) {
  let alive = 0;
  for (let e = 0; e < edges.count; e++) {
    if (edges.lengths[e] <= eps) alive++;
    else break;
  }
  console.log(
    `  eps=${eps.toFixed(2)}  edges=${String(alive).padStart(5)}  H0=${componentsAt(deaths, N, eps)}`
  );
}

/* 6 — epsilonCurve: must be monotone and cover [0,1] exactly. Drag, keyboard
   and autoplay all share it, so a non-monotone patch would make scrubbing
   reverse direction mid-gesture. */
console.log("\nepsilonCurve");
let mono = true;
let prev = -1;
for (let i = 0; i <= 1000; i++) {
  const v = epsilonCurve(i / 1000);
  if (v < prev - 1e-9) mono = false;
  prev = v;
}
ok("monotone non-decreasing over p in [0,1]", mono);
ok("curve(0) == 0", Math.abs(epsilonCurve(0)) < 1e-9);
ok("curve(1) == 1", Math.abs(epsilonCurve(1) - 1) < 1e-9);
ok("curve(0.75) == 0.86 (the rest state)", Math.abs(epsilonCurve(0.75) - 0.86) < 1e-9);

/* 7 — The picker must agree with a brute-force screen-space projection, and
   must rank by CURSOR distance rather than depth. */
console.log("\npicking (screen-space nearest to cursor)");
// Perspective MVP matching the scene: fov 48, aspect 1.25, camera at z 2.6,
// group scale 0.66. Column-major, the layout pickNearest expects.
const fov = (48 * Math.PI) / 180;
const f = 1 / Math.tan(fov / 2);
const aspect = 1.25;
const near = 0.6;
const far = 8;
const s3 = 0.66;
const camZ = 2.6;
const W = 448;
const H = 358;

// clip.x = (f/aspect)*s*x ; clip.y = f*s*y ; clip.w = -(s*z - camZ)
const M = new Array(16).fill(0);
M[0] = (f / aspect) * s3;
M[5] = f * s3;
M[10] = ((far + near) / (near - far)) * s3;
M[14] = ((far + near) / (near - far)) * -camZ + (2 * far * near) / (near - far);
M[11] = -s3;
M[15] = camZ;

function project(x: number, y: number, z: number) {
  return {
    cx: M[0] * x,
    cy: M[5] * y,
    cw: M[11] * z + M[15],
  };
}

function bruteNearest(cxPx: number, cyPx: number, radius: number) {
  let best = -1;
  let bestD2 = radius * radius;
  for (let i = 0; i < N; i++) {
    const { cx, cy, cw } = project(
      cloud.positions[i * 3], cloud.positions[i * 3 + 1], cloud.positions[i * 3 + 2]
    );
    if (cw <= 0) continue;
    const sx = (cx / cw + 1) * W * 0.5;
    const sy = (1 - cy / cw) * H * 0.5;
    const d2 = (sx - cxPx) ** 2 + (sy - cyPx) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = i; }
  }
  return best;
}

let pickMismatch = 0, pickTested = 0, pickHits = 0;
for (let gx = 0; gx < 10; gx++) {
  for (let gy = 0; gy < 8; gy++) {
    const cxPx = (gx + 0.5) * (W / 10);
    const cyPx = (gy + 0.5) * (H / 8);
    const mine = pickNearest(cloud.positions, N, M, cxPx, cyPx, W, H, 18);
    const brute = bruteNearest(cxPx, cyPx, 18);
    pickTested++;
    if (brute !== -1) pickHits++;
    if (mine.id !== brute) pickMismatch++;
  }
}
ok(
  `${pickTested} cursor positions vs brute force`,
  pickMismatch === 0,
  `mismatches=${pickMismatch} hits=${pickHits}`
);

console.log(failures === 0 ? "\nAll assertions passed.\n" : `\n${failures} assertion(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
