import { blank, cellXZ, clamp, DYE_CHECK, hash2, type Tensor } from "./core.ts";

/* SIDEWALK's core move: a restriction written in a PDF ("w 34 st, both sides,
 * between 7 av and 8 av") is resolved to concrete block faces by breadth-first
 * search over the street centreline graph. This is a SCHEMATIC slice of
 * Midtown (5 avenues x 8 streets) and paraphrased example rules, not the
 * city's geometry or the PDF's wording. */

export const AVENUES = ["9 av", "8 av", "7 av", "6 av", "5 av"] as const; // west -> east (left -> right)
export const STREETS = ["w 40 st", "w 39 st", "w 38 st", "w 37 st", "w 36 st", "w 35 st", "w 34 st", "w 33 st"] as const; // north -> south (back -> front)

type Side = "north" | "south" | "east" | "west" | "both";
export interface Rule {
  text: string;
  from: [number, number]; // [avenue index, street index]
  to: [number, number];
  side: Side;
}

export const RULES: Rule[] = [
  { text: "w 34 st, both sides, between 8 av and 7 av", from: [1, 6], to: [2, 6], side: "both" },
  { text: "7 av, east side, from w 39 st to w 35 st", from: [2, 1], to: [2, 5], side: "east" },
  { text: "w 38 st, north side, from 9 av to 6 av", from: [0, 2], to: [3, 2], side: "north" },
  { text: "5 av, west side, from w 36 st to w 33 st", from: [4, 4], to: [4, 7], side: "west" },
];

const NA = AVENUES.length;
const NS = STREETS.length;
const nodeId = (a: number, s: number) => s * NA + a;
const nodeA = (id: number) => id % NA;
const nodeS = (id: number) => Math.floor(id / NA);

export interface Face {
  block: [number, number]; // [block col between avenues bi..bi+1, block row between streets bj..bj+1]
  side: "n" | "s" | "e" | "w";
  label: string;
}

export interface Walk {
  order: number[]; // BFS visit order (node ids)
  path: number[]; // shortest path, from -> to
  faces: Face[];
}

function neighbours(id: number) {
  const a = nodeA(id);
  const s = nodeS(id);
  const out: number[] = [];
  if (a > 0) out.push(nodeId(a - 1, s));
  if (a < NA - 1) out.push(nodeId(a + 1, s));
  if (s > 0) out.push(nodeId(a, s - 1));
  if (s < NS - 1) out.push(nodeId(a, s + 1));
  return out;
}

/** Breadth-first search from the rule's first endpoint until the second is
 * dequeued; then walk parents back for the path and collect the faces on the
 * rule's side of every path segment. */
export function walk(rule: Rule): Walk {
  const start = nodeId(rule.from[0], rule.from[1]);
  const goal = nodeId(rule.to[0], rule.to[1]);
  const parent = new Map<number, number>([[start, -1]]);
  const queue = [start];
  const order: number[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    order.push(n);
    if (n === goal) break;
    for (const m of neighbours(n)) {
      if (!parent.has(m)) {
        parent.set(m, n);
        queue.push(m);
      }
    }
  }
  const path: number[] = [];
  for (let n = goal; n !== -1; n = parent.get(n)!) path.push(n);
  path.reverse();

  const faces: Face[] = [];
  for (let k = 0; k + 1 < path.length; k++) {
    const p = path[k];
    const q = path[k + 1];
    const a0 = Math.min(nodeA(p), nodeA(q));
    const s0 = Math.min(nodeS(p), nodeS(q));
    if (nodeS(p) === nodeS(q)) {
      // Along a street, between avenues a0 and a0+1.
      const street = STREETS[s0];
      const span = `${AVENUES[a0]} to ${AVENUES[a0 + 1]}`;
      if ((rule.side === "north" || rule.side === "both") && s0 > 0)
        faces.push({ block: [a0, s0 - 1], side: "s", label: `${street}, north side, ${span}` });
      if ((rule.side === "south" || rule.side === "both") && s0 < NS - 1)
        faces.push({ block: [a0, s0], side: "n", label: `${street}, south side, ${span}` });
    } else {
      // Along an avenue, between streets s0 and s0+1.
      const avenue = AVENUES[a0];
      const span = `${STREETS[s0]} to ${STREETS[s0 + 1]}`;
      if ((rule.side === "west" || rule.side === "both") && a0 > 0)
        faces.push({ block: [a0 - 1, s0], side: "e", label: `${avenue}, west side, ${span}` });
      if ((rule.side === "east" || rule.side === "both") && a0 < NA - 1)
        faces.push({ block: [a0, s0], side: "w", label: `${avenue}, east side, ${span}` });
    }
  }
  return { order, path, faces };
}

export interface SidewalkView {
  rule: number;
  /** 0..1: BFS flood over the first 75%, then the path and faces resolve. */
  progress: number;
}

export const sidewalkDefaultView: SidewalkView = { rule: 0, progress: 1 };

const MARGIN_X = 0.07;
const MARGIN_Z = 0.07;

export function sidewalkTensor(cols: number, rows: number, view: SidewalkView = sidewalkDefaultView): Tensor {
  const t = blank(cols, rows);
  const aspect = cols / rows;
  const cell = 1 / rows;
  const ax = (i: number) => -aspect / 2 + MARGIN_X + (i * (aspect - 2 * MARGIN_X)) / (NA - 1);
  const sz = (j: number) => -0.5 + MARGIN_Z + (j * (1 - 2 * MARGIN_Z)) / (NS - 1);
  const hwA = Math.max(0.016, cell * 0.55);
  const hwS = Math.max(0.011, cell * 0.5);
  const faceW = cell * 1.05;

  const rule = RULES[clamp(view.rule, 0, RULES.length - 1) | 0];
  const w = walk(rule);
  const shownVisits = Math.floor(clamp(view.progress / 0.75) * w.order.length);
  const visitIndex = new Map<number, number>();
  w.order.slice(0, shownVisits).forEach((n, k) => visitIndex.set(n, k + 1));
  const resolved = view.progress >= 0.85;
  const pathSet = new Set(resolved ? w.path : []);
  const faceSet = new Map<string, string>();
  if (resolved) for (const f of w.faces) faceSet.set(`${f.block[0]},${f.block[1]},${f.side}`, f.label);
  const endpoints = new Set([nodeId(...rule.from), nodeId(...rule.to)]);

  const tags: string[] = new Array(cols * rows).fill("");
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const { x, z } = cellXZ(c, r, cols, rows);
      let onA = -1;
      let onS = -1;
      for (let a = 0; a < NA; a++) if (Math.abs(x - ax(a)) < hwA) onA = a;
      for (let s = 0; s < NS; s++) if (Math.abs(z - sz(s)) < hwS) onS = s;

      if (onA >= 0 && onS >= 0) {
        const id = nodeId(onA, onS);
        const visit = visitIndex.get(id);
        const isEnd = endpoints.has(id);
        t.h[i] = pathSet.has(id) ? 0.62 : visit ? 0.5 : isEnd ? 0.4 : 0.04;
        tags[i] = `${AVENUES[onA]} & ${STREETS[onS]} · intersection${visit ? ` · bfs visit ${visit}` : ""}${isEnd ? " · endpoint named in the rule" : ""}`;
        continue;
      }
      if (onA >= 0 || onS >= 0) {
        // Road segment: raised if it is on the resolved path.
        let onPath = false;
        if (onS >= 0 && resolved) {
          for (let k = 0; k + 1 < w.path.length; k++) {
            const p = w.path[k];
            const q = w.path[k + 1];
            if (nodeS(p) === onS && nodeS(q) === onS) {
              const lo = Math.min(ax(nodeA(p)), ax(nodeA(q)));
              const hi = Math.max(ax(nodeA(p)), ax(nodeA(q)));
              if (x > lo && x < hi) onPath = true;
            }
          }
        }
        if (onA >= 0 && resolved) {
          for (let k = 0; k + 1 < w.path.length; k++) {
            const p = w.path[k];
            const q = w.path[k + 1];
            if (nodeA(p) === onA && nodeA(q) === onA) {
              const lo = Math.min(sz(nodeS(p)), sz(nodeS(q)));
              const hi = Math.max(sz(nodeS(p)), sz(nodeS(q)));
              if (z > lo && z < hi) onPath = true;
            }
          }
        }
        t.h[i] = onPath ? 0.34 : 0.04;
        tags[i] = onS >= 0 ? `${STREETS[onS]} · street${onPath ? " · on the bfs path" : ""}` : `${AVENUES[onA]} · avenue${onPath ? " · on the bfs path" : ""}`;
        continue;
      }

      // Inside a block: find which block and how far from each edge.
      let bi = -1;
      let bj = -1;
      for (let a = 0; a + 1 < NA; a++) if (x > ax(a) && x < ax(a + 1)) bi = a;
      for (let s = 0; s + 1 < NS; s++) if (z > sz(s) && z < sz(s + 1)) bj = s;
      if (bi < 0 || bj < 0) {
        t.h[i] = 0.2 + 0.05 * hash2(Math.floor(x * 9), Math.floor(z * 9), 3);
        tags[i] = "block · outside this slice";
        continue;
      }
      const dW = x - ax(bi) - hwA;
      const dE = ax(bi + 1) - hwA - x;
      const dN = z - sz(bj) - hwS;
      const dS = sz(bj + 1) - hwS - z;
      const m = Math.min(dW, dE, dN, dS);
      const side = m === dN ? "n" : m === dS ? "s" : m === dW ? "w" : "e";
      const blockName = `${AVENUES[bi]} to ${AVENUES[bi + 1]}, ${STREETS[bj]} to ${STREETS[bj + 1]}`;
      if (m < faceW) {
        const label = faceSet.get(`${bi},${bj},${side}`);
        if (label) {
          t.h[i] = 0.82;
          t.dye[i] = DYE_CHECK;
          tags[i] = `${label} · block face · resolved`;
        } else {
          t.h[i] = 0.36;
          tags[i] = `block face · ${blockName}`;
        }
      } else {
        t.h[i] = 0.24 + 0.07 * hash2(bi, bj, 7);
        tags[i] = `block · ${blockName}`;
      }
    }
  }
  t.describe = (i) => tags[i];
  return t;
}
