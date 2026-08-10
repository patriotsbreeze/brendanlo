/**
 * Vietoris–Rips filtration over a cell-cycle manifold.
 *
 * Deliberately free of any `three` import so it stays testable and
 * tree-shakeable, and so the geometry can be verified independently of how it
 * is drawn.
 *
 * The shape is not arbitrary. Cell-cycle genes in single-cell expression data
 * genuinely produce circular topology, which is the canonical reason to run
 * persistent homology on expression data — so a noisy loop with one branch,
 * embedded in R^8 and projected to R^3, is the honest object here.
 */

/** Deterministic PRNG, so the figure is identical on every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIM = 8;

/** Box–Muller, for isotropic noise in the ambient space. */
function gauss(rnd: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Orthonormalise a set of vectors in place-ish, returning a new basis. */
function gramSchmidt(vecs: number[][]): number[][] {
  const basis: number[][] = [];
  for (const raw of vecs) {
    let v = raw.slice();
    for (const b of basis) {
      const d = v.reduce((s, x, i) => s + x * b[i], 0);
      v = v.map((x, i) => x - d * b[i]);
    }
    const n = Math.hypot(...v);
    basis.push(v.map((x) => x / n));
  }
  return basis;
}

/**
 * Symmetric eigendecomposition by cyclic Jacobi. Used to find the principal
 * axes of the R^8 sample so the projection to R^3 keeps the three directions
 * that actually carry variance.
 *
 * Returns eigenvectors as rows, sorted by descending eigenvalue.
 */
function jacobiEigenvectors(input: number[][], sweeps = 12): number[][] {
  const n = input.length;
  const a = input.map((r) => r.slice());
  // V accumulates the rotations; its columns are the eigenvectors.
  const v: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  for (let sweep = 0; sweep < sweeps; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-18) break;

    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-15) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t =
          Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }

  const order = Array.from({ length: n }, (_, i) => i).sort((x, y) => a[y][y] - a[x][x]);
  return order.map((idx) => v.map((row) => row[idx]));
}

export interface Cloud {
  /** Flat xyz triples, length n * 3, normalised into roughly [-1, 1]. */
  positions: Float32Array;
  count: number;
}

/**
 * Sample the manifold: a closed loop (the cycle) with one branch departing
 * from it (the exit into arrest), plus heteroscedastic noise — the branch is
 * noisier than the loop, as it is in real data.
 */
export function buildCloud(count: number, seed = 20260809): Cloud {
  const rnd = mulberry32(seed);

  // Two orthogonal directions in R^8 carry the loop; a third carries the branch.
  //
  // These MUST be orthonormalised together. Normalising three independent
  // Gaussian vectors leaves a1·a2 ~ 1/sqrt(8) ~ 0.35, which shears the "circle"
  // into a thin ellipse — the cloud then projects to a near-flat disc no camera
  // can make look three-dimensional.
  const [a1, a2, a3] = gramSchmidt([
    Array.from({ length: DIM }, () => gauss(rnd)),
    Array.from({ length: DIM }, () => gauss(rnd)),
    Array.from({ length: DIM }, () => gauss(rnd)),
  ]);

  const branchFrac = 0.24;
  // Keep the ambient samples: the projection basis is derived from them below.
  const ambient: number[][] = new Array(count);

  for (let i = 0; i < count; i++) {
    const p = new Array(DIM).fill(0);
    const onBranch = rnd() < branchFrac;

    if (!onBranch) {
      const th = rnd() * Math.PI * 2;
      const c = Math.cos(th);
      const s = Math.sin(th);
      for (let d = 0; d < DIM; d++) p[d] = c * a1[d] + s * a2[d];
      // Tight scatter around the cycle.
      for (let d = 0; d < DIM; d++) p[d] += gauss(rnd) * 0.055;
    } else {
      // Branch leaves the loop near theta0 and runs outward.
      const th0 = 1.15;
      const t = rnd();
      const c = Math.cos(th0);
      const s = Math.sin(th0);
      for (let d = 0; d < DIM; d++) {
        p[d] = c * a1[d] + s * a2[d] + t * 1.05 * a3[d];
      }
      // Noise grows along the branch — heteroscedastic, as in real trajectories.
      const sd = 0.05 + t * 0.075;
      for (let d = 0; d < DIM; d++) p[d] += gauss(rnd) * sd;
    }

    ambient[i] = p;
  }

  // Project R^8 -> R^3 through the sample's own top three principal components,
  // not through a random orthonormal basis. A random basis can land almost
  // perpendicular to the manifold's third direction, collapsing the cloud into
  // a pancake; the principal axes keep the three directions carrying variance.
  const mean = new Array(DIM).fill(0);
  for (const p of ambient) for (let d = 0; d < DIM; d++) mean[d] += p[d];
  for (let d = 0; d < DIM; d++) mean[d] /= count;

  const cov: number[][] = Array.from({ length: DIM }, () => new Array(DIM).fill(0));
  for (const p of ambient) {
    for (let a = 0; a < DIM; a++) {
      const va = p[a] - mean[a];
      for (let b = a; b < DIM; b++) cov[a][b] += va * (p[b] - mean[b]);
    }
  }
  for (let a = 0; a < DIM; a++) {
    for (let b = a; b < DIM; b++) {
      cov[a][b] /= count;
      cov[b][a] = cov[a][b];
    }
  }
  const basis = jacobiEigenvectors(cov).slice(0, 3);

  const raw = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const p = ambient[i];
    for (let k = 0; k < 3; k++) {
      let acc = 0;
      for (let d = 0; d < DIM; d++) acc += (p[d] - mean[d]) * basis[k][d];
      raw[i * 3 + k] = acc;
    }
  }

  // Recentre on the centroid, then normalise by the radius ABOUT THE CENTROID.
  // Rotating about anything but the centroid reads as wobble rather than spin.
  const c = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    c[0] += raw[i * 3];
    c[1] += raw[i * 3 + 1];
    c[2] += raw[i * 3 + 2];
  }
  c[0] /= count;
  c[1] /= count;
  c[2] /= count;

  let maxR = 0;
  for (let i = 0; i < count; i++) {
    raw[i * 3] -= c[0];
    raw[i * 3 + 1] -= c[1];
    raw[i * 3 + 2] -= c[2];
    const r = Math.hypot(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]);
    if (r > maxR) maxR = r;
  }
  const k = maxR > 0 ? 1 / maxR : 1;
  for (let i = 0; i < raw.length; i++) raw[i] *= k;

  return { positions: raw, count };
}

export interface Edges {
  /** Non-indexed line-segment vertices: 2 per edge, xyz each. */
  positions: Float32Array;
  /** Per-vertex birth epsilon in [0,1]; both endpoints share a value. */
  births: Float32Array;
  /**
   * Per-vertex endpoint ids (i, j) — the SAME pair on both vertices of an edge,
   * so a varying derived from it stays constant along the segment. Lets the
   * shader light the edges incident to a hovered point with no CPU work.
   */
  aEnds: Float32Array;
  /** Normalised birth epsilon per edge, ascending — the filtration order. */
  lengths: Float32Array;
  /** Flat pairs (i, j) matching `lengths`. */
  pairs: Uint16Array;
  /**
   * World-space length of the longest kept edge. births = length / maxLen, so
   * a ball of radius `eps` in birth units is `eps * maxLen` in world units.
   * TIER-DEPENDENT (it differs between the desktop and mobile point counts) —
   * always thread it through as data, never hardcode it.
   */
  maxLen: number;
  count: number;
}

/**
 * Build the Rips edge list up to a target size.
 *
 * Collects every pair under a generous cutoff, sorts by length, and keeps the
 * shortest `maxEdges`. Storing each edge's birth epsilon as a vertex attribute
 * is what makes the whole animation a single uniform write per frame: the
 * shader compares aBirth against uEpsilon, so no geometry is ever rebuilt.
 */
export function buildEdges(cloud: Cloud, maxEdges = 15000, cutoff = 0.2): Edges {
  const { positions, count } = cloud;
  const cut2 = cutoff * cutoff;

  // Pass 1 — histogram the squared distances. Collecting every candidate under
  // a generous cutoff and sorting it means handling ~350k pairs to keep 15k;
  // bucketing first lets pass 2 collect only what is actually needed.
  const BINS = 512;
  const hist = new Int32Array(BINS);
  for (let i = 0; i < count; i++) {
    const xi = positions[i * 3];
    const yi = positions[i * 3 + 1];
    const zi = positions[i * 3 + 2];
    for (let j = i + 1; j < count; j++) {
      const dx = xi - positions[j * 3];
      const dy = yi - positions[j * 3 + 1];
      const dz = zi - positions[j * 3 + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < cut2) hist[(d2 / cut2 * BINS) | 0]++;
    }
  }

  // Smallest bin whose cumulative count covers maxEdges.
  let cum = 0;
  let bin = BINS - 1;
  for (let b = 0; b < BINS; b++) {
    cum += hist[b];
    if (cum >= maxEdges) {
      bin = b;
      break;
    }
  }
  const keep2 = ((bin + 1) / BINS) * cut2;
  const capacity = cum;

  // Pass 2 — collect only pairs under the tuned threshold, into typed arrays.
  const iBuf = new Uint16Array(capacity);
  const jBuf = new Uint16Array(capacity);
  const dBuf = new Float32Array(capacity);
  let n = 0;
  for (let i = 0; i < count && n < capacity; i++) {
    const xi = positions[i * 3];
    const yi = positions[i * 3 + 1];
    const zi = positions[i * 3 + 2];
    for (let j = i + 1; j < count; j++) {
      const dx = xi - positions[j * 3];
      const dy = yi - positions[j * 3 + 1];
      const dz = zi - positions[j * 3 + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 <= keep2) {
        if (n >= capacity) break;
        iBuf[n] = i;
        jBuf[n] = j;
        dBuf[n] = d2;
        n++;
      }
    }
  }

  const order = Array.from({ length: n }, (_, k) => k);
  order.sort((a, b) => dBuf[a] - dBuf[b]);
  const keep = Math.min(maxEdges, n);

  // Normalise births against the longest kept edge so epsilon runs 0 -> 1.
  const maxLen = keep > 0 ? Math.sqrt(dBuf[order[keep - 1]]) : 1;

  const vpos = new Float32Array(keep * 6);
  const births = new Float32Array(keep * 2);
  const aEnds = new Float32Array(keep * 4);
  const lengths = new Float32Array(keep);
  const pairs = new Uint16Array(keep * 2);

  for (let e = 0; e < keep; e++) {
    const k = order[e];
    const i = iBuf[k];
    const j = jBuf[k];
    const len = Math.sqrt(dBuf[k]);
    const birth = len / maxLen;

    vpos[e * 6 + 0] = positions[i * 3];
    vpos[e * 6 + 1] = positions[i * 3 + 1];
    vpos[e * 6 + 2] = positions[i * 3 + 2];
    vpos[e * 6 + 3] = positions[j * 3];
    vpos[e * 6 + 4] = positions[j * 3 + 1];
    vpos[e * 6 + 5] = positions[j * 3 + 2];

    births[e * 2] = birth;
    births[e * 2 + 1] = birth;

    // The same (i, j) on BOTH vertices, so any varying derived from it is
    // constant along the segment rather than interpolating between endpoints.
    aEnds[e * 4 + 0] = i;
    aEnds[e * 4 + 1] = j;
    aEnds[e * 4 + 2] = i;
    aEnds[e * 4 + 3] = j;

    lengths[e] = birth;
    pairs[e * 2] = i;
    pairs[e * 2 + 1] = j;
  }

  return { positions: vpos, births, aEnds, lengths, pairs, maxLen, count: keep };
}

/**
 * H0 persistence, computed exactly — union-find over edges in ascending length
 * is precisely the minimum spanning tree, and each successful union is the
 * death of one connected component. Nothing here is faked: the bar count at a
 * given epsilon equals the number of connected components at that epsilon.
 */
export function h0Barcode(edges: Edges, pointCount: number): number[] {
  const parent = new Int32Array(pointCount);
  for (let i = 0; i < pointCount; i++) parent[i] = i;

  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    // Path compression.
    let c = x;
    while (parent[c] !== c) {
      const next = parent[c];
      parent[c] = r;
      c = next;
    }
    return r;
  };

  const deaths: number[] = [];
  for (let e = 0; e < edges.count; e++) {
    const a = find(edges.pairs[e * 2]);
    const b = find(edges.pairs[e * 2 + 1]);
    if (a !== b) {
      parent[a] = b;
      deaths.push(edges.lengths[e]);
    }
  }
  return deaths;
}

/** Connected components at a given epsilon — the value the barcode must agree with. */
export function componentsAt(deaths: number[], pointCount: number, eps: number): number {
  let merged = 0;
  for (const d of deaths) {
    if (d <= eps) merged++;
    else break;
  }
  return pointCount - merged;
}
